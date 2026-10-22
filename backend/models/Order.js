const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems : [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true, default: 1 },
            price: { type: Number, required: true }
        }
    ],
    totalPrice: { type: Number, required: true },
    address: { 
        fullName: { type: String, required: true },
        street: { type: String, required: true }, 
        city: { type: String, required: true }, 
        state: { type: String, required: true }, 
        zipCode: { type: String, required: true } },
    paymentMethod: { type: String },
    status: { type: String, enum: ["pending", "shipped", "delivered"], default: "pending" },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);