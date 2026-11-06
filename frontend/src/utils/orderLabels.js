// Customer-friendly names for the order and payment states stored by the server.
export const ORDER_STATUS_LABELS = {
  pending: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS = {
  cod_pending: "Pay cash on delivery",
  payment_pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed / expired",
  refund_pending: "Refund in progress",
  refunded: "Refunded",
};

export const orderStatusLabel = (s) => ORDER_STATUS_LABELS[s] || s || "Order placed";
export const paymentStatusLabel = (s) => PAYMENT_STATUS_LABELS[s] || s || "N/A";

// Short readable id until the server issues sequential order numbers (Phase 2)
export const shortOrderId = (id) => (id ? `AB-${String(id).slice(-6).toUpperCase()}` : "");

// The number customers see: AB-10432 for new orders, a short id for older ones
export const orderRef = (order) => order?.orderNumber || shortOrderId(order?._id);

// Customers can cancel until the store starts packing
export const canCustomerCancel = (order) => ["pending", "confirmed"].includes(order?.status);

// An online order that was saved but not paid yet, and is still within its payment window
export const canPayNow = (order) =>
  order?.paymentMethod === "Razorpay" &&
  order?.paymentStatus === "payment_pending" &&
  order?.status !== "cancelled" &&
  (!order?.expiresAt || new Date(order.expiresAt) > new Date());
