const express = require("express");
const { protect } = require("../middleware/authMiddleware.js");
const { createOrder, verifyPayment } = require("../controllers/paymentController.js");

const router = express.Router();

router.post("/order", protect, createOrder);
router.post("/verify", protect, verifyPayment);

module.exports = router;
