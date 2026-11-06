const settings = require("../config/settings");
const { slotsEnabled, getAvailableSlots, serviceAreaEnabled, isServiceable } = require("../utils/deliverySlots");

// Public store rules the browser needs for display. The server still enforces every one of them.
const getConfig = (req, res) => {
    res.json({
        deliveryFee: settings.DELIVERY_FEE,
        freeDeliveryAbove: settings.FREE_DELIVERY_ABOVE,
        studentDiscountPercent: settings.STUDENT_DISCOUNT_PERCENT,
        slotsEnabled: slotsEnabled(),
        serviceAreaEnabled: serviceAreaEnabled(),
    });
};

// Changes minute by minute, so never cached
const getSlots = (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.json({ enabled: slotsEnabled(), days: getAvailableSlots() });
};

const checkPincode = (req, res) => {
    const pin = String(req.params.pin || "").trim();
    if (!/^\d{6}$/.test(pin)) return res.status(400).json({ message: "Please enter a valid 6-digit PIN code" });
    res.json({ pincode: pin, serviceable: isServiceable(pin) });
};

module.exports = { getConfig, getSlots, checkPincode };
