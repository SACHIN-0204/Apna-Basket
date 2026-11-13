const mongoose = require("mongoose");
const { normalizePhone } = require("../utils/phone");

// Small dependency-free request validators. Each one either answers 400 or replaces req.body with a
// cleaned copy (known fields only). Strings only: rejecting objects/arrays blocks NoSQL operator
// injection such as { "email": { "$ne": null } }.
const isStr = (v) => typeof v === "string";
const clean = (v) => (isStr(v) ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim() : v);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fail = (res, message) => res.status(400).json({ message });

const need = (v, label, { min = 1, max = 200 } = {}) => {
  if (!isStr(v)) return `${label} is required`;
  const c = clean(v);
  if (c.length < min) return min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`;
  if (c.length > max) return `${label} must be at most ${max} characters`;
  return null;
};

const register = (req, res, next) => {
  const b = req.body || {};
  const err = need(b.username, "Name", { min: 2, max: 60 }) || need(b.email, "Email", { max: 254 }) || need(b.password, "Password", { min: 8, max: 72 });
  if (err) return fail(res, err);
  if (!EMAIL_RE.test(clean(b.email))) return fail(res, "Please enter a valid email address");
  if (!/[A-Za-z]/.test(b.password) || !/\d/.test(b.password)) return fail(res, "Password must contain at least one letter and one number");
  req.body = { username: clean(b.username), email: clean(b.email).toLowerCase(), password: b.password };
  next();
};

const login = (req, res, next) => {
  const b = req.body || {};
  if (!isStr(b.email) || !isStr(b.password) || !b.email || !b.password || b.password.length > 200) {
    return fail(res, "Email and password are required");
  }
  req.body = { email: clean(b.email).toLowerCase(), password: b.password };
  next();
};

const emailOnly = (req, res, next) => {
  const b = req.body || {};
  if (!isStr(b.email) || !EMAIL_RE.test(clean(b.email))) return fail(res, "A valid email is required");
  req.body = { email: clean(b.email).toLowerCase() };
  next();
};

const verifyEmailOtp = (req, res, next) => {
  const b = req.body || {};
  if (!isStr(b.email) || !EMAIL_RE.test(clean(b.email))) return fail(res, "A valid email is required");
  if (!isStr(b.otp) || !/^\d{6}$/.test(clean(b.otp))) return fail(res, "OTP must be a 6-digit code");
  req.body = { email: clean(b.email).toLowerCase(), otp: clean(b.otp) };
  next();
};

// Phone numbers and OTPs may arrive as strings or numbers from the browser; objects are refused
const phoneBody = (req, res, next) => {
  const b = req.body || {};
  for (const k of ["phone", "otp"]) {
    if (b[k] !== undefined && !["string", "number"].includes(typeof b[k])) return fail(res, "Invalid request");
  }
  next();
};

const PAYMENT_METHODS = ["Cash on Delivery", "Razorpay"];

const order = (req, res, next) => {
  const b = req.body || {};
  if (!Array.isArray(b.orderItems) || b.orderItems.length < 1 || b.orderItems.length > 50) {
    return fail(res, Array.isArray(b.orderItems) && b.orderItems.length === 0 ? "Your cart is empty" : "Order must contain between 1 and 50 items");
  }
  const orderItems = [];
  for (const item of b.orderItems) {
    const id = String(item?.productId?._id || item?.productId || "");
    const quantity = Number(item?.quantity);
    if (!mongoose.Types.ObjectId.isValid(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return fail(res, "Invalid order item");
    }
    orderItems.push({ productId: id, quantity }); // any client-sent price is dropped on purpose
  }

  const a = b.address;
  if (!a || typeof a !== "object" || Array.isArray(a)) return fail(res, "Shipping address is required");
  const parts = [["fullName", 100], ["street", 250], ["city", 100], ["state", 100], ["zipCode", 10]];
  for (const [field, max] of parts) {
    if (!isStr(a[field]) || !clean(a[field])) return fail(res, "Please fill in all delivery address fields");
    if (clean(a[field]).length > max) return fail(res, "Please check your delivery address");
  }
  if (!/^\d{6}$/.test(clean(a.zipCode))) return fail(res, "Please enter a valid 6-digit PIN code");

  const paymentMethod = b.paymentMethod === undefined ? "Cash on Delivery" : b.paymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) return fail(res, "Invalid payment method");

  // Contact number is needed so the delivery person can reach the customer. Falls back to the account phone.
  const rawPhone = b.contactPhone ?? req.user?.phone;
  const contactPhone = normalizePhone(rawPhone);
  if (!contactPhone) return fail(res, "Please enter a valid 10-digit mobile number so we can reach you for delivery");

  const studentBypass = b.studentBypass === true;
  if (studentBypass && !(isStr(b.studentEmail) && EMAIL_RE.test(clean(b.studentEmail)))) {
    return fail(res, "The student discount needs a college email (for example name@college.ac.in or name@college.edu).");
  }
  if (b.deliverySlot !== undefined && !isStr(b.deliverySlot)) return fail(res, "Invalid delivery time");

  req.body = {
    orderItems,
    address: {
      fullName: clean(a.fullName), street: clean(a.street), city: clean(a.city),
      state: clean(a.state), zipCode: clean(a.zipCode),
    },
    contactPhone,
    deliverySlot: isStr(b.deliverySlot) ? clean(b.deliverySlot).slice(0, 40) : "",
    paymentMethod,
    studentBypass,
    studentEmail: studentBypass ? clean(b.studentEmail).toLowerCase() : "",
  };
  next();
};

const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const orderStatus = (req, res, next) => {
  const status = req.body?.status;
  if (!isStr(status) || !ORDER_STATUSES.includes(status)) return fail(res, `Status must be one of: ${ORDER_STATUSES.join(", ")}`);
  req.body = { status };
  next();
};

const objectIdParam = (name = "id") => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[name])) return res.status(404).json({ message: "Not found" });
  next();
};

module.exports = { register, login, emailOnly, verifyEmailOtp, phoneBody, order, orderStatus, objectIdParam };
