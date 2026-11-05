const rateLimit = require("express-rate-limit");

const make = (windowMs, limit, message) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message },
    });

// Login, register and OTP verification: stops password / OTP guessing from one IP
const authLimiter = make(15 * 60 * 1000, 30, "Too many attempts. Please try again in 15 minutes.");

// Anything that sends an email: stops inbox flooding and SMTP quota burn
const otpEmailLimiter = make(15 * 60 * 1000, 6, "Too many OTP requests. Please try again in 15 minutes.");

// Price quotes are public, so keep them from being used to hammer the database
const quoteLimiter = make(60 * 1000, 60, "Too many requests. Please slow down.");

module.exports = { authLimiter, otpEmailLimiter, quoteLimiter };
