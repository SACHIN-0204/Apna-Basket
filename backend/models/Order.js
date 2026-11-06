const mongoose = require("mongoose");

// Fulfilment (what is happening to the parcel). "shipped" is shown to customers as "Out for delivery".
const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

// Payment (what is happening to the money). Kept separate so the two never get mixed up.
const PAYMENT_STATUSES = [
    "cod_pending",      // Cash on Delivery, to be collected
    "payment_pending",  // online payment started, not yet confirmed
    "paid",
    "failed",           // online payment expired or was abandoned
    "refund_pending",   // money was taken but the order is cancelled: refund manually in Razorpay
    "refunded",
];

const statusEntrySchema = new mongoose.Schema(
    {
        status: { type: String },          // fulfilment status at that moment
        paymentStatus: { type: String },
        by: { type: String, default: "system" }, // "customer", "admin", "system" or "payment"
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        // Short readable number shown to customers (AB-10432). Older orders do not have one.
        orderNumber: { type: String, unique: true, sparse: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orderItems: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                quantity: { type: Number, required: true, default: 1 },
                price: { type: Number, required: true },
            },
        ],

        // Exactly what the customer was charged, all calculated on the server
        itemsTotal: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        totalPrice: { type: Number, required: true },
        studentEmail: { type: String, default: "" },

        address: {
            fullName: { type: String, required: true },
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zipCode: { type: String, required: true },
        },
        contactPhone: { type: String, default: "" },

        paymentMethod: { type: String, enum: ["Cash on Delivery", "Razorpay"], default: "Cash on Delivery" },
        paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "cod_pending" },
        razorpayOrderId: { type: String, index: true, sparse: true },
        razorpayPaymentId: { type: String },
        // Unpaid online orders are cancelled automatically after this time and the stock goes back
        expiresAt: { type: Date, default: null },

        status: { type: String, enum: ORDER_STATUSES, default: "pending" },
        // Chosen delivery window, e.g. { date: "2026-11-06", start: "18:00", end: "21:00", label: "Today, 6 pm - 9 pm" }
        deliverySlot: {
            date: { type: String },
            start: { type: String },
            end: { type: String },
            label: { type: String },
        },
        // Who changed what and when: powers the tracking timeline
        statusHistory: { type: [statusEntrySchema], default: [] },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, expiresAt: 1 });

const Order = mongoose.model("Order", orderSchema);
Order.ORDER_STATUSES = ORDER_STATUSES;
Order.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = Order;
