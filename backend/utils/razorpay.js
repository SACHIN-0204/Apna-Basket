const Razorpay = require("razorpay");

let instance;

// Created lazily so the server still boots (and COD still works) without Razorpay keys.
const getRazorpay = () => {
    if (!instance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay keys are not configured");
        }
        instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return instance;
};

module.exports = { getRazorpay };
