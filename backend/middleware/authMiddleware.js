const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password -otp -otpExpires");

        // A valid token for a deleted account must not get through
        if (!user) {
            return res.status(401).json({ message: "Not authorized, user no longer exists" });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Not authorized, token failed" });
    }
};

module.exports = { protect };
