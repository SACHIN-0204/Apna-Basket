const express = require("express");
const router = express.Router();
const { registerUser, verifyOtp, resendOtp, loginUser, getUser, requestPhoneOtp, verifyPhoneOtp } = require("../controllers/authController.js");
const { protect } = require("../middleware/authMiddleware.js");
const { admin } = require("../middleware/adminMiddleware.js");
const { authLimiter, otpEmailLimiter, phoneOtpLimiter } = require("../middleware/rateLimiters.js");

router.post("/register", otpEmailLimiter, registerUser);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/resend-otp", otpEmailLimiter, resendOtp);
router.post("/login", authLimiter, loginUser);
router.post("/otp/request", phoneOtpLimiter, requestPhoneOtp);
router.post("/otp/verify", authLimiter, verifyPhoneOtp);
router.get("/users", protect, admin, getUser);

module.exports = router;
