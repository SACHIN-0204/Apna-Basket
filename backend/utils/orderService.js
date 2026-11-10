const Order = require("../models/Order");
const Product = require("../models/Product");
const { getRazorpay } = require("./razorpay");

// ---------------------------------------------------------------- config
// Keep DELIVERY_FEE in sync with the delivery fee shown in frontend/src/pages/Checkout.jsx.
const DELIVERY_FEE_PAISE = Math.round((Number(process.env.DELIVERY_FEE ?? 40) || 0) * 100);
const STUDENT_DISCOUNT_RATE = 0.1;
// Optional comma-separated allow-list, e.g. "ac.in,edu.in". When empty, any valid email is accepted.
const studentDomains = () =>
    (process.env.STUDENT_EMAIL_DOMAINS || "")
        .split(",")
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean);

const toRupees = (paise) => paise / 100;

// ---------------------------------------------------------------- stock
const restoreStock = async (items) => {
    await Promise.all(
        items.map((item) =>
            Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
        )
    );
};

// ---------------------------------------------------------------- pricing
// Works in integer paise so there is no floating point drift. Prices come from the
// database rows that were passed in, never from the browser.
const priceOrder = (items, { studentBypass = false, studentEmail = "" } = {}) => {
    const itemsPaise = items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0);
    const deliveryPaise = items.length ? DELIVERY_FEE_PAISE : 0;

    let discountPaise = 0;
    let validStudentEmail = "";
    if (studentBypass) {
        const email = String(studentEmail || "").trim().toLowerCase();
        const domain = email.split("@")[1] || "";
        const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const domains = studentDomains();
        const allowed = !domains.length || domains.some((d) => domain === d || domain.endsWith("." + d));
        if (!looksValid || !allowed) {
            const err = new Error("Please enter a valid student email to use the student discount.");
            err.status = 400;
            throw err;
        }
        validStudentEmail = email;
        discountPaise = Math.round(itemsPaise * STUDENT_DISCOUNT_RATE);
    }

    const totalPaise = Math.max(0, itemsPaise + deliveryPaise - discountPaise);
    return {
        itemsTotal: toRupees(itemsPaise),
        deliveryFee: toRupees(deliveryPaise),
        discount: toRupees(discountPaise),
        totalPrice: toRupees(totalPaise),
        totalPaise,
        studentEmail: validStudentEmail,
    };
};

// ---------------------------------------------------------------- refunds
// Marks the order refund_pending BEFORE calling Razorpay, so a crash mid-way never
// leaves a cancelled-but-paid order looking settled.
const refundOrder = async (order) => {
    if (!order.razorpayPaymentId) return order.paymentStatus;

    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "refund_pending" } });
    try {
        const refund = await getRazorpay().payments.refund(order.razorpayPaymentId, {
            amount: Math.round(order.totalPrice * 100),
            speed: "normal",
            notes: { orderId: String(order._id), reason: order.cancelReason || "Order cancelled" },
        });
        await Order.updateOne(
            { _id: order._id },
            { $set: { paymentStatus: "refunded", razorpayRefundId: refund.id } }
        );
        return "refunded";
    } catch (error) {
        // Stays refund_pending so it is visible and can be refunded from the Razorpay dashboard.
        console.error(`Refund failed for order ${order._id}:`, error?.error?.description || error.message);
        return "refund_pending";
    }
};

// ---------------------------------------------------------------- cancellation
// The status change is ONE atomic update that only matches an order in an allowed state.
// That guarantees stock is returned exactly once, even if two cancels (or a cancel and a
// payment confirmation) arrive at the same time.
// Returns the cancelled order, or null if it could not be cancelled from its current state.
const cancelOrder = async (filter, { allowedFrom = ["pending"], reason = "" } = {}) => {
    const order = await Order.findOneAndUpdate(
        { ...filter, status: { $in: allowedFrom } },
        { $set: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason } },
        { new: true }
    );
    if (!order) return null;

    await restoreStock(order.orderItems);

    if (order.paymentMethod === "Razorpay") {
        if (order.paymentStatus === "paid") {
            order.paymentStatus = await refundOrder(order);
        } else if (order.paymentStatus === "pending") {
            await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "failed" } });
            order.paymentStatus = "failed";
        }
    }
    return order;
};

// ---------------------------------------------------------------- abandoned payments
// An online order reserves stock the moment it is created. If the customer closes the tab
// without paying, release it. Before cancelling, ask Razorpay whether a payment actually
// landed (e.g. the customer paid but lost connection before we heard back).
const PAYMENT_WINDOW_MS = (Number(process.env.PAYMENT_WINDOW_MINUTES) || 30) * 60 * 1000;

const expireUnpaidOrders = async () => {
    const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MS);
    const stale = await Order.find({
        paymentMethod: "Razorpay",
        paymentStatus: "pending",
        status: "pending",
        timestamp: { $lt: cutoff },
    }).limit(50);

    for (const order of stale) {
        try {
            if (order.razorpayOrderId) {
                const { items = [] } = await getRazorpay().orders.fetchPayments(order.razorpayOrderId);
                const captured = items.find((p) => p.status === "captured");
                if (captured) {
                    await Order.updateOne(
                        { _id: order._id, paymentStatus: "pending", status: "pending" },
                        { $set: { paymentStatus: "paid", razorpayPaymentId: captured.id, paidAt: new Date() } }
                    );
                    continue;
                }
                // A payment that is authorized but not yet captured is still in flight - leave it.
                if (items.some((p) => p.status === "authorized")) continue;
            }
            await cancelOrder({ _id: order._id, paymentStatus: "pending" }, { reason: "Payment not completed" });
        } catch (error) {
            console.error(`Could not reconcile order ${order._id}:`, error?.error?.description || error.message);
        }
    }
};

module.exports = {
    restoreStock,
    priceOrder,
    refundOrder,
    cancelOrder,
    expireUnpaidOrders,
};
