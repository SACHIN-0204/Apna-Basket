const sendEmail = require("./sendEmail");
const Order = require("../models/Order");

const escapeHtml = (v = "") =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const formatOrderItems = (order) => {
    if (!order?.orderItems?.length) return "No items";

    return order.orderItems
        .map((item) => {
            const productName = escapeHtml(item.productId?.name || "Product");
            return `<li style="padding:6px 0; border-bottom:1px solid #f0f0f0;">${productName} × ${item.quantity} <span style="float:right; color:#1f2937;">₹${item.price}</span></li>`;
        })
        .join("");
};

const buildOrderEmail = (order, eventType) => {
    const customerName = escapeHtml(order.user?.username || "Customer");
    const orderId = order._id ? String(order._id).slice(-6).toUpperCase() : "N/A";
    const total = order.totalPrice || 0;
    const paymentMethod = order.paymentMethod || "N/A";
    const statusText = order.status || "pending";

    let subject = "";
    let heading = "";
    let intro = "";
    let highlight = "";

    switch (eventType) {
        case "order-confirmed":
            subject = "Order confirmed - Apna Basket";
            heading = "Order confirmed";
            intro = "Thank you for shopping with us. Your order has been received and is now being prepared.";
            highlight = `Order ID: <strong>${orderId}</strong><br />Payment Method: <strong>${paymentMethod}</strong><br />Total Amount: <strong>₹${total}</strong>`;
            break;
        case "payment-success":
            subject = "Payment successful - Apna Basket";
            heading = "Payment successful";
            intro = "We have received your payment successfully and your order is now moving forward.";
            highlight = `Order ID: <strong>${orderId}</strong><br />Amount Paid: <strong>₹${total}</strong>`;
            break;
        case "order-cancelled":
            subject = "Order cancelled - Apna Basket";
            heading = "Order cancelled";
            intro = "Your order has been cancelled as requested. We’re here if you need help.";
            highlight = `Order ID: <strong>${orderId}</strong><br />Cancelled Amount: <strong>₹${total}</strong>`;
            break;
        default:
            subject = `Order status updated - ${statusText}`;
            heading = "Order status updated";
            intro = `Your order status has been updated to <strong>${statusText}</strong>.`;
            highlight = `Order ID: <strong>${orderId}</strong><br />Current Status: <strong>${statusText}</strong>`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; background:#f7f9fc; padding:24px; color:#111827;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="background:linear-gradient(135deg, #1f4f3d, #2e7d32); padding:24px 28px; color:#ffffff;">
            <h2 style="margin:0; font-size:24px;">Apna Basket</h2>
            <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Fresh essentials, delivered with care</p>
          </div>
          <div style="padding:28px;">
            <h3 style="margin:0 0 10px; font-size:22px; color:#111827;">${heading}</h3>
            <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">Hello ${customerName}, ${intro}</p>
            <div style="background:#f8fafc; padding:14px 16px; border-radius:8px; margin-bottom:16px; font-size:14px; line-height:1.7; color:#111827;">
              ${highlight}
            </div>
            <div style="margin-bottom:12px; font-weight:600; color:#111827;">Order Items</div>
            <ul style="list-style:none; padding:0; margin:0 0 16px;">
              ${formatOrderItems(order)}
            </ul>
            <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.6;">Thank you for choosing Apna Basket. We appreciate your trust and look forward to serving you again.</p>
          </div>
          <div style="background:#f9fafb; padding:16px 28px; font-size:12px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
            © 2026 Apna Basket. All rights reserved.
          </div>
        </div>
      </div>
    `;

    return { subject, html };
};

const sendOrderEmail = async (order, eventType) => {
    if (!order?.user?.email) return;

    const { subject, html } = buildOrderEmail(order, eventType);
    await sendEmail(order.user.email, subject, html);
};

// Loads the order with the fields the email needs, then sends. Never throws: an email problem
// must not break an order or payment that has already been saved.
const sendOrderEmailById = async (orderId, eventType) => {
    try {
        const order = await Order.findById(orderId)
            .populate("user", "username email")
            .populate("orderItems.productId", "name");
        await sendOrderEmail(order, eventType);
    } catch (error) {
        console.error(`Order email (${eventType}) failed:`, error.message);
    }
};

module.exports = { sendOrderEmail, sendOrderEmailById };
