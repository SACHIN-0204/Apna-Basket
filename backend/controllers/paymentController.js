const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv").config();
const Order = require("../models/Order");
const sendEmail = require("../utils/sendEmail");

const sendPaymentSuccessEmail = async (order) => {
  if (!order?.user?.email) return;

  const subject = "Payment successful - Apna Basket";
  const html = `
    <div style="font-family: Arial, sans-serif; background:#f7f9fc; padding:24px; color:#111827;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1f4f3d, #2e7d32); padding:24px 28px; color:#ffffff;">
          <h2 style="margin:0; font-size:24px;">Apna Basket</h2>
          <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Payment confirmed</p>
        </div>
        <div style="padding:28px;">
          <h3 style="margin:0 0 10px; font-size:22px; color:#111827;">Payment successful</h3>
          <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">Hello ${order.user.name || "Customer"}, we have received your payment successfully.</p>
          <div style="background:#f8fafc; padding:14px 16px; border-radius:8px; margin-bottom:16px; font-size:14px; line-height:1.7; color:#111827;">
            Order ID: <strong>${order._id}</strong><br />Amount Paid: <strong>₹${order.totalPrice}</strong>
          </div>
          <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.6;">Your order is now moving ahead and we will keep you updated.</p>
        </div>
        <div style="background:#f9fafb; padding:16px 28px; font-size:12px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
          © 2026 Apna Basket. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendEmail(order.user.email, subject, html);
};

const createOrder = async (req, res) => {
    try {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const options = {
        amount: req.body.amount * 100,
        currency: "INR",
        receipt: crypto.randomBytes(10).toString("hex"),
      };
      const order = await instance.orders.create(options);
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({message: "Server error"});
    }
};

const verifyPayment = async (req, res) => {
      try {
       const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
       const generated_signature = crypto
       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
       .update(razorpay_order_id + " | " + razorpay_payment_id)
       .digest("hex");

       if(generated_signature === razorpay_signature) {
        const order = await Order.findById(orderId).populate("user", "name email");

        if (order) {
          order.status = "paid";
          await order.save();

          if (order.user?.email) {
            await sendPaymentSuccessEmail(order);
          }
        }

        res.status(200).json({ message: "Payment verified successfully!" });
       } else {
        res.status(400).json({ message: "Payment verification failed"});
       }

      } catch (error) {
        res.status(500).json({ message: "server error"});
      }
};

module.exports = {
  createOrder,
  verifyPayment
}