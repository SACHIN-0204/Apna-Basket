const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { sendOrderEmailById } = require("../utils/orderEmail");
const { notifyOrderSms } = require("../utils/notify");

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay is not configured on the server");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const hmacHex = (secret, payload) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

// Constant-time comparison so a signature cannot be guessed from response timing
const safeEqual = (a, b) => {
    const A = Buffer.from(String(a ?? ""), "utf8");
    const B = Buffer.from(String(b ?? ""), "utf8");
    return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// Records a confirmed payment. Used by both the browser verify call and the webhook,
// so it must be safe to run twice for the same payment.
// Returns "paid" (just now), "already_paid", or "refund_pending" (order had already been cancelled).
const markOrderPaid = async (order, paymentId) => {
    const paid = await Order.updateOne(
        { _id: order._id, paymentStatus: "payment_pending", status: { $ne: "cancelled" } },
        {
            $set: { paymentStatus: "paid", razorpayPaymentId: paymentId, expiresAt: null },
            $push: { statusHistory: { status: "pending", paymentStatus: "paid", by: "payment", note: "Payment received", at: new Date() } },
        }
    );
    if (paid.modifiedCount === 1) {
        sendOrderEmailById(order._id, "payment-success"); // not awaited; never throws
        notifyOrderSms(order, "payment-success");
        return "paid";
    }

    const fresh = await Order.findById(order._id).select("status paymentStatus");
    if (fresh?.paymentStatus === "paid" || fresh?.paymentStatus === "refund_pending" || fresh?.paymentStatus === "refunded") {
        return fresh.paymentStatus === "paid" ? "already_paid" : "refund_pending";
    }

    // The order expired or was cancelled before the money arrived: keep a record so it can be refunded
    await Order.updateOne(
        { _id: order._id, paymentStatus: { $in: ["failed", "payment_pending"] } },
        { $set: { paymentStatus: "refund_pending", razorpayPaymentId: paymentId } }
    );
    return "refund_pending";
};

// @desc    Start an online payment for an order that already exists
// @route   POST /api/payments/order        body: { orderId }
// @access  Private
// The amount is taken from the saved order. The browser never decides what to charge.
const createOrder = async (req, res) => {
    try {
        const { orderId } = req.body || {};
        if (!mongoose.Types.ObjectId.isValid(String(orderId || ""))) {
            return res.status(400).json({ message: "Invalid order" });
        }

        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.paymentMethod !== "Razorpay") {
            return res.status(400).json({ message: "This order is not an online-payment order" });
        }
        if (order.status === "cancelled" || order.paymentStatus !== "payment_pending") {
            return res.status(409).json({ message: "This order can no longer be paid. Please place a new order." });
        }
        if (order.expiresAt && order.expiresAt < new Date()) {
            return res.status(409).json({ message: "This order expired because payment was not completed. Please place a new order." });
        }

        const amount = Math.round(order.totalPrice * 100); // paise
        let razorpayOrderId = order.razorpayOrderId;

        // Reuse the same Razorpay order if the customer is retrying
        if (!razorpayOrderId) {
            const created = await getRazorpay().orders.create({
                amount,
                currency: "INR",
                receipt: String(order._id),
                notes: { orderId: String(order._id) },
            });
            razorpayOrderId = created.id;
            await Order.updateOne({ _id: order._id }, { $set: { razorpayOrderId } });
        }

        res.status(200).json({
            id: razorpayOrderId,
            amount,
            currency: "INR",
            keyId: process.env.RAZORPAY_KEY_ID, // public key, safe to send
            orderId: order._id,
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error?.error?.description || error.message);
        res.status(500).json({ message: "Could not start the payment. Please try again." });
    }
};

// @desc    Confirm a payment after the customer pays in the Razorpay window
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v)) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // Razorpay signs "order_id|payment_id" (no spaces)
        const expected = hmacHex(process.env.RAZORPAY_KEY_SECRET || "", `${razorpay_order_id}|${razorpay_payment_id}`);
        if (!safeEqual(expected, razorpay_signature)) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // Only the customer who owns this order can confirm it
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Order not found for this payment" });

        const outcome = await markOrderPaid(order, razorpay_payment_id);
        if (outcome === "refund_pending") {
            return res.status(409).json({
                message: "Your payment arrived after the order had expired. It will be refunded. Please contact the store if you need help.",
            });
        }

        res.status(200).json({ message: "Payment verified successfully!", orderId: order._id });
    } catch (error) {
        console.error("Payment verification error:", error.message);
        res.status(500).json({ message: "Server error while verifying the payment" });
    }
};

// @desc    Razorpay calls this by itself, so a paid order is never lost if the customer closes the tab
// @route   POST /api/payments/webhook
// @access  Public, protected by Razorpay's signature
const razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.error("RAZORPAY_WEBHOOK_SECRET is not set; webhook ignored");
            return res.status(503).json({ message: "Webhook not configured" });
        }

        const signature = req.get("x-razorpay-signature");
        if (!req.rawBody || !signature || !safeEqual(hmacHex(secret, req.rawBody), signature)) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const { event, payload } = req.body || {};
        if (event === "payment.captured" || event === "order.paid") {
            const payment = payload?.payment?.entity;
            if (payment?.order_id && payment?.id) {
                const order = await Order.findOne({ razorpayOrderId: payment.order_id });
                if (order) await markOrderPaid(order, payment.id);
            }
        }

        // Always answer 200 for a valid signature so Razorpay does not keep retrying
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Razorpay webhook error:", error.message);
        res.status(500).json({ message: "Webhook error" });
    }
};

module.exports = { createOrder, verifyPayment, razorpayWebhook, hmacHex, safeEqual };
