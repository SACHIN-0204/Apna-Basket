const mongoose = require("mongoose");
const Order = require("../models/Order");
const { ORDER_STATUSES } = require("../models/Order");
const Product = require("../models/Product");
const sendEmail = require("../utils/sendEmail");
const { restoreStock, priceOrder, cancelOrder } = require("../utils/orderService");

const PAYMENT_METHODS = ["Cash on Delivery", "Razorpay"];

const stockMessage = (unavailable) =>
    "Some items are not available in the quantity you chose: " +
    unavailable
        .map((u) => (u.available > 0 ? `${u.name} (only ${u.available} left)` : `${u.name} (unavailable)`))
        .join(", ");

const loadPopulated = (id) =>
    Order.findById(id)
        .populate("user", "username email")
        .populate("orderItems.productId", "name");

const formatOrderItems = (order) => {
    if (!order?.orderItems?.length) return "No items";

    return order.orderItems
        .map((item) => {
            const productName = item.productId?.name || "Product";
            return `<li style="padding:6px 0; border-bottom:1px solid #f0f0f0;">${productName} × ${item.quantity} <span style="float:right; color:#1f2937;">₹${item.price}</span></li>`;
        })
        .join("");
};

const buildOrderEmail = (order, eventType) => {
    const customerName = order.user?.username || "Customer";
    const orderId = order._id || "N/A";
    const total = order.totalPrice || 0;
    const paymentMethod = order.paymentMethod || "N/A";
    const statusText = order.status || "pending";

    let subject = "";
    let heading = "";
    let intro = "";
    let highlight = "";

    switch (eventType) {
        case "order-confirmed":
            subject = "Order confirmed - Abhishek Kirana Store";
            heading = "Order confirmed";
            intro = "Thank you for shopping with us. Your order has been received and is now being prepared.";
            highlight = `Order ID: <strong>${orderId}</strong><br />Payment Method: <strong>${paymentMethod}</strong><br />Total Amount: <strong>₹${total}</strong>`;
            break;
        case "payment-success":
            subject = "Payment successful - Abhishek Kirana Store";
            heading = "Payment successful";
            intro = "We have received your payment successfully and your order is now moving forward.";
            highlight = `Order ID: <strong>${orderId}</strong><br />Amount Paid: <strong>₹${total}</strong>`;
            break;
        case "order-cancelled":
            subject = "Order cancelled - Abhishek Kirana Store";
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
            <h2 style="margin:0; font-size:24px;">Abhishek Kirana Store</h2>
            <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Fresh essentials, delivered with care</p>
          </div>
          <div style="padding:28px;">
            <h3 style="margin:0 0 10px; font-size:22px; color:#111827;">${heading}</h3>
            <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">${intro}</p>
            <div style="background:#f8fafc; padding:14px 16px; border-radius:8px; margin-bottom:16px; font-size:14px; line-height:1.7; color:#111827;">
              ${highlight}
            </div>
            <div style="margin-bottom:12px; font-weight:600; color:#111827;">Order Items</div>
            <ul style="list-style:none; padding:0; margin:0 0 16px;">
              ${formatOrderItems(order)}
            </ul>
            <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.6;">Thank you for choosing Abhishek Kirana Store. We appreciate your trust and look forward to serving you again.</p>
          </div>
          <div style="background:#f9fafb; padding:16px 28px; font-size:12px; color:#6b7280; text-align:center; border-top:1px solid #e5e7eb;">
            © 2026 Abhishek Kirana Store. All rights reserved.
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

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
// The browser only says WHAT it wants (product ids + quantities), WHERE to send it and HOW to
// pay. Prices, delivery fee, discount and total are all calculated here from the database.
// Online (Razorpay) orders are created as unpaid; the customer then pays via /api/payments.
const createOrder = async (req, res) => {
    const reserved = [];
    let orderSaved = false;

    try {
        const { orderItems, address, paymentMethod = "Cash on Delivery", studentBypass, studentEmail } = req.body;

        if (!PAYMENT_METHODS.includes(paymentMethod)) {
            return res.status(400).json({ message: "Invalid payment method" });
        }
        if (!Array.isArray(orderItems) || orderItems.length === 0 || !address || typeof address !== "object") {
            return res.status(400).json({ message: "Invalid order data" });
        }

        // Only accept the address fields we know about, as plain non-empty strings
        const cleanAddress = {};
        for (const field of ["fullName", "street", "city", "state", "zipCode"]) {
            const value = String(address[field] ?? "").trim();
            if (!value) return res.status(400).json({ message: `Address ${field} is required` });
            cleanAddress[field] = value;
        }

        // 1. Clean the request: validate ids and quantities, merge duplicate products
        const wanted = new Map();
        for (const item of orderItems) {
            const id = String(item.productId?._id || item.productId || "");
            const quantity = Number(item.quantity);
            if (!mongoose.Types.ObjectId.isValid(id) || !Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({ message: "Invalid order item" });
            }
            wanted.set(id, (wanted.get(id) || 0) + quantity);
        }

        // 2. Load the real products (real prices and stock) from the database
        const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        // 3. Check availability
        const unavailable = [];
        for (const [id, quantity] of wanted) {
            const product = productMap.get(id);
            if (!product || product.isActive === false) {
                unavailable.push({ productId: id, name: product?.name || "A product", available: 0 });
            } else if (product.stock < quantity) {
                unavailable.push({ productId: id, name: product.name, available: product.stock });
            }
        }
        if (unavailable.length) {
            return res.status(409).json({ message: stockMessage(unavailable), unavailable });
        }

        // 4. Price the order from DATABASE prices (throws a 400 for a bad student email)
        const items = [...wanted].map(([id, quantity]) => ({
            productId: id,
            quantity,
            price: productMap.get(id).price,
        }));
        const pricing = priceOrder(items, { studentBypass: studentBypass === true, studentEmail });

        // 5. Reserve stock atomically. The condition stock >= quantity means two customers
        //    can never both buy the last item.
        for (const [id, quantity] of wanted) {
            const updated = await Product.findOneAndUpdate(
                { _id: id, isActive: { $ne: false }, stock: { $gte: quantity } },
                { $inc: { stock: -quantity } },
                { new: true }
            );
            if (!updated) {
                await restoreStock(reserved); // undo what we reserved so far
                reserved.length = 0;
                const fresh = await Product.findById(id).select("name stock");
                const problem = [{ productId: id, name: fresh?.name || "A product", available: fresh?.stock || 0 }];
                return res.status(409).json({ message: stockMessage(problem), unavailable: problem });
            }
            reserved.push({ productId: id, quantity });
        }

        const order = await Order.create({
            user: req.user._id,
            orderItems: items,
            itemsTotal: pricing.itemsTotal,
            deliveryFee: pricing.deliveryFee,
            discount: pricing.discount,
            studentEmail: pricing.studentEmail,
            totalPrice: pricing.totalPrice,
            address: cleanAddress,
            paymentMethod,
            paymentStatus: "pending",
            status: "pending",
        });
        orderSaved = true;

        // 6. Cash on delivery is confirmed immediately. Online orders are confirmed once the
        //    payment is verified (see paymentController). Email failures never fail the order.
        if (paymentMethod === "Cash on Delivery") {
            try {
                await sendOrderEmail(await loadPopulated(order._id), "order-confirmed");
            } catch (emailError) {
                console.error("Order confirmation email failed:", emailError);
            }
        }

        res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
        if (!orderSaved && reserved.length) {
            await restoreStock(reserved).catch((e) => console.error("Stock rollback failed:", e));
        }
        res.status(error.status || 500).json({ message: error.message });
    }
};

const myOrders = async (req, res) => {
    try {
       const orders = await Order.find({ user: req.user._id })
           .sort({ timestamp: -1 })
           .populate(`orderItems.productId`, `name price`);
       res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOrders = async (req, res) =>{
     try {
        const orders = await Order.find().sort({ timestamp: -1 }).populate(`user`, `username email`);
        res.status(200).json({ orders });
     } catch (error) {
        res.status(500).json({ message: error.message });
     }
};

// @desc    Customer cancels their own order
// @route   PUT /api/orders/:id/cancel
// @access  Private (owner only)
// Allowed only while the order is still "pending" (not yet shipped). Stock goes back on the
// shelf, and an already-paid online order is refunded.
const cancelMyOrder = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const owned = await Order.exists({ _id: req.params.id, user: req.user._id });
        if (!owned) return res.status(404).json({ message: "Order not found" });

        const order = await cancelOrder(
            { _id: req.params.id, user: req.user._id },
            { allowedFrom: ["pending"], reason: "Cancelled by customer" }
        );
        if (!order) {
            return res.status(409).json({ message: "This order can no longer be cancelled" });
        }

        try {
            await sendOrderEmail(await loadPopulated(order._id), "order-cancelled");
        } catch (emailError) {
            console.error("Order cancellation email failed:", emailError);
        }

        const message =
            order.paymentStatus === "refunded" || order.paymentStatus === "refund_pending"
                ? "Order cancelled. Your payment will be refunded to the original payment method."
                : "Order cancelled.";
        res.json({ message, order });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error cancelling order" });
    }
};

// @desc    Admin updates an order's fulfilment status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${ORDER_STATUSES.join(", ")}` });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const existing = await Order.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: "Order not found" });

        if (existing.status === status) {
            return res.json({ message: "Order status unchanged", order: await loadPopulated(existing._id) });
        }
        // Stock was already returned when it was cancelled, so don't allow reopening
        if (existing.status === "cancelled") {
            return res.status(400).json({ message: "A cancelled order cannot be reopened" });
        }

        if (status === "cancelled") {
            const cancelled = await cancelOrder(
                { _id: existing._id },
                { allowedFrom: ["pending", "shipped"], reason: "Cancelled by admin" }
            );
            if (!cancelled) {
                return res.status(409).json({ message: "A delivered order cannot be cancelled" });
            }
            try {
                await sendOrderEmail(await loadPopulated(cancelled._id), "order-cancelled");
            } catch (emailError) {
                console.error("Order status email failed:", emailError);
            }
            return res.json({ message: "Order cancelled", order: await loadPopulated(cancelled._id) });
        }

        // Don't ship goods that haven't been paid for
        if (existing.paymentMethod === "Razorpay" && existing.paymentStatus !== "paid") {
            return res.status(400).json({ message: "This order is still awaiting online payment" });
        }

        const update = { status };
        // Cash is collected at the door, so delivery is when a COD order becomes paid
        if (status === "delivered" && existing.paymentMethod === "Cash on Delivery") {
            update.paymentStatus = "paid";
            update.paidAt = new Date();
        }

        const updated = await Order.findOneAndUpdate(
            { _id: existing._id, status: { $ne: "cancelled" } },
            { $set: update },
            { new: true }
        );
        if (!updated) {
            return res.status(409).json({ message: "Order was cancelled in the meantime" });
        }

        const populated = await loadPopulated(updated._id);
        try {
            await sendOrderEmail(populated, "status-updated");
        } catch (emailError) {
            console.error("Order status email failed:", emailError);
        }

        res.json({ message: "Order status updated", order: populated });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error updating order status" });
    }
};

module.exports = {
    createOrder,
    myOrders,
    getOrders,
    cancelMyOrder,
    updateOrderStatus
};
