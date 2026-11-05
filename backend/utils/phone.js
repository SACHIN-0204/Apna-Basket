// Indian mobile numbers: 10 digits starting with 6-9. Accepts +91, 91 and 0 prefixes.
const normalizePhone = (raw) => {
    let digits = String(raw ?? "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

module.exports = { normalizePhone };
