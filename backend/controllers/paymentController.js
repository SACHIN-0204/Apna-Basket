const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const sendEmail = require("../utils/sendEmail");
const { getRazorpay } = require("../utils/razorpay");
const { refundOrder } = require("../utils/orderService");

const sendPaymentSuccessEmail = async (order) => {
  if (!order?.user?.email) return;

  const subject = "Payment successful - Abhishek Kirana Store";
  const html = `
    <div style="font-family: Arial, sans-serif; background:#f7f9fc; padding:24px; color:#111827;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1f4f3d, #2e7d32); padding:24px 28px; color:#ffffff;">
          <h2 style="margin:0; font-size:24px;">Abhishek Kirana Store</h2>
          <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Payment confirmed</p>
        </div>
        <div style="padding:28px;">
          <h3 style="margin:0 0 10px; font-size:22px; color:#111827;">Payment successful</h3>
          <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">Hello ${order.user.username || "Customer"}, we have received your payment successfully.</p>
          <div style="background:#f8fafc; padding:14px 16px; border-radius:8px; margin-bottom:16px; font-size:14px; line-height:1.7; color:#111827;">
            Order ID: <strong>${order._id}</strong><br />Amount Paid: <strong>₹${order.totalPrice}</strong>
          </div>
          <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.6;">Your order is now moving ahead and we will keep you updated.</p>
        </div>
        <div style="background:#f9fafb; padding:16px 28px; font-size:12px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
          © 2026 Abhishek Kirana Store. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendEmail(order.user.email, subject, html);
};


// @desc    Start an online payment for an order that already exists
// @route   POST /api/payments/order        body: { orderId }
// @access  Private (owner only)
// The amount is taken from the saved order (which the server priced), never from the browser.
const createOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.paymentMethod !== "Razorpay") {
            return res.status(400).json({ message: "This order is not an online payment order" });
        }
        if (order.status !== "pending" || order.paymentStatus !== "pending") {
            return res.status(409).json({ message: "This order is not awaiting payment" });
        }

        const amount = Math.round(order.totalPrice * 100); // paise
        const respond = (rzpOrderId) =>
            res.status(200).json({
                id: rzpOrderId,
                amount,
                currency: "INR",
                key: process.env.RAZORPAY_KEY_ID,
                orderId: order._id,
            });

        // Retrying the same order reuses its Razorpay order instead of creating another
        if (order.razorpayOrderId) return respond(order.razorpayOrderId);

        const rzpOrder = await getRazorpay().orders.create({
            amount,
            currency: "INR",
            receipt: String(order._id),
            notes: { orderId: String(order._id) },
        });

        // Link the two orders. If a parallel request linked one first, use that one.
        const linked = await Order.findOneAndUpdate(
            { _id: order._id, razorpayOrderId: null },
            { $set: { razorpayOrderId: rzpOrder.id } },
            { new: true }
        );
        return respond(linked ? linked.razorpayOrderId : (await Order.findById(order._id)).razorpayOrderId);
    } catch (error) {
        console.error("Razorpay order creation failed:", error?.error?.description || error.message);
        res.status(500).json({ message: "Unable to start payment" });
    }
};

// @desc    Verify the signature Razorpay returns after payment, then mark the order paid
// @route   POST /api/payments/verify       body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// @access  Private (owner only)
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v)) {
            return res.status(400).json({ message: "Missing payment details" });
        }

        // Razorpay signs "<order_id>|<payment_id>" - exactly that, with no spaces around the pipe
        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        const a = Buffer.from(expected);
        const b = Buffer.from(razorpay_signature);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // Find OUR order through the Razorpay order id, and only if it belongs to this user.
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
        if (!order) return res.status(404).json({ message: "No order found for this payment" });

        // Same payment submitted twice (double click, retry): succeed without doing it again
        if (order.paymentStatus === "paid" && order.razorpayPaymentId === razorpay_payment_id) {
            return res.status(200).json({ message: "Payment verified successfully!", order });
        }

        const paid = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "pending", status: { $ne: "cancelled" } },
            { $set: { paymentStatus: "paid", razorpayPaymentId: razorpay_payment_id, paidAt: new Date() } },
            { new: true }
        );

        if (!paid) {
            const current = await Order.findById(order._id);

            // The order was cancelled (by the customer, an admin, or the expiry job) while the
            // customer was paying. The money is real, so give it back.
            if (current.status === "cancelled" && ["pending", "failed"].includes(current.paymentStatus)) {
                const claimed = await Order.findOneAndUpdate(
                    { _id: current._id, paymentStatus: { $in: ["pending", "failed"] } },
                    { $set: { paymentStatus: "paid", razorpayPaymentId: razorpay_payment_id, paidAt: new Date() } },
                    { new: true }
                );
                if (claimed) await refundOrder(claimed);
                return res.status(409).json({
                    message: "This order was cancelled before your payment completed. Your payment will be refunded.",
                });
            }
            return res.status(409).json({ message: "This order has already been paid" });
        }

        try {
            const populated = await Order.findById(paid._id).populate("user", "username email");
            await sendPaymentSuccessEmail(populated);
        } catch (emailError) {
            console.error("Payment success email failed:", emailError);
        }

        res.status(200).json({ message: "Payment verified successfully!", order: paid });
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createOrder,
    verifyPayment
};
