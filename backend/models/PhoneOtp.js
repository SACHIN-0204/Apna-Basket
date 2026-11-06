const mongoose = require("mongoose");

// One pending login code per phone number. Kept apart from User so a guest
// (who has no account yet) can verify their phone before an account exists.
const phoneOtpSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    // How many codes were sent in the current hour (stops SMS-bill abuse)
    sendCount: { type: Number, default: 1 },
    sendWindowStart: { type: Date, default: Date.now },
});

// MongoDB removes expired codes by itself
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PhoneOtp", phoneOtpSchema);
