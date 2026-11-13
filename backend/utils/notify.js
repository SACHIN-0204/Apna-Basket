const { sendSms, isConfigured } = require("./sms");

const label = (o) => o.orderNumber || `AB-${String(o._id).slice(-6).toUpperCase()}`;

const MESSAGES = {
    "order-confirmed": (o) =>
        `Kusora: order ${label(o)} received. Total Rs ${o.totalPrice}.${o.deliverySlot?.label ? ` Delivery: ${o.deliverySlot.label}.` : ""} Thank you!`,
    "payment-success": (o) => `Kusora: payment of Rs ${o.totalPrice} received for order ${label(o)}.`,
    "order-cancelled": (o) => `Kusora: order ${label(o)} has been cancelled.`,
    confirmed: (o) => `Kusora: order ${label(o)} is confirmed and being prepared.`,
    packed: (o) => `Kusora: order ${label(o)} is packed and will leave soon.`,
    shipped: (o) => `Kusora: order ${label(o)} is out for delivery. Please keep your phone handy.`,
    delivered: (o) => `Kusora: order ${label(o)} delivered. Thank you for shopping with us!`,
};

// Text message about an order. Never throws and is never awaited by callers:
// an SMS problem must not break an order that is already saved.
const notifyOrderSms = async (order, event) => {
    try {
        const build = MESSAGES[event];
        if (!build || !order?.contactPhone || !isConfigured()) return;
        const text = build(order);
        await sendSms(order.contactPhone, text, {
            kind: "order",
            vars: { var1: label(order), var2: text },
        });
    } catch (error) {
        console.error(`Order SMS (${event}) failed:`, error.message);
    }
};

module.exports = { notifyOrderSms, orderLabel: label };
