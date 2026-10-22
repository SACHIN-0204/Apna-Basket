const express = require("express");
const router = express.Router();
const { registerUser, verifyOtp, resendOtp, loginUser, getUser } = require("../controllers/authController.js");
const { protect } = require("../middleware/authMiddleware.js");
const { admin } = require("../middleware/adminMiddleware.js");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.get("/users", protect, admin, getUser);

module.exports = router;