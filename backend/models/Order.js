const mongoose = require("mongoose");

// Fulfilment status (what the store is doing with the order)
const ORDER_STATUSES = ["pending", "shipped", "delivered", "cancelled"];

// Payment status (what has happened to the money) - kept separate from fulfilment status
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_pending", "refunded"];

const orderSchema = new mongoose.Schema({
    user : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems : [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true, default: 1 },
            price: { type: Number, required: true }
        }
    ],

    // Pricing breakdown - always computed on the server (see utils/orderService.js)
    itemsTotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    studentEmail: { type: String, default: "" },
    totalPrice: { type: Number, required: true },

    address: {
        fullName: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true } },

    paymentMethod: { type: String, enum: ["Cash on Delivery", "Razorpay"], default: "Cash on Delivery" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },

    // Razorpay bookkeeping. razorpayOrderId is how a payment is tied back to this order.
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpayRefundId: { type: String, default: null },
    paidAt: { type: Date },

    cancelledAt: { type: Date },
    cancelReason: { type: String, default: "" },

    timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
