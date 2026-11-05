const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createOrder, verifyPayment, razorpayWebhook } = require("../controllers/paymentController.js");

const router = express.Router();

router.post("/order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
// Called by Razorpay, not by a logged-in customer: protected by signature instead
router.post("/webhook", razorpayWebhook);

module.exports = router;
