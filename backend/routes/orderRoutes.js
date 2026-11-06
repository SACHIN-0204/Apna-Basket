const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { quoteLimiter } = require("../middleware/rateLimiters");
const { quoteOrder, createOrder, getOrders, myOrders, updateOrderStatus, getOrderById, cancelMyOrder, reorder } = require("../controllers/orderController.js");

const router = express.Router();

router.post("/quote", quoteLimiter, quoteOrder);
router.route("/").post(protect, createOrder).get(protect, admin, getOrders);
router.route("/myorders").get(protect, myOrders);
router.get("/:id", protect, getOrderById);
router.post("/:id/cancel", protect, cancelMyOrder);
router.post("/:id/reorder", protect, reorder);
router.route("/:id/status").put(protect, admin, updateOrderStatus);

module.exports = router;
