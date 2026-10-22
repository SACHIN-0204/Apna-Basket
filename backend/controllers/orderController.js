const Order = require("../models/Order");
const User = require("../models/User");

const mongoose = require("mongoose");
const Product = require("../models/Product");

const DELIVERY_FEE = 0; // ADJUST: flat delivery charge in ₹, if you have one

// Put reserved stock back (used on cancel or failure)
const restoreStock = async (items) => {
    await Promise.all(
        items.map((item) =>
            Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
        )
    );
};

const stockMessage = (unavailable) =>
    "Some items are not available in the quantity you chose: " +
    unavailable
        .map((u) => (u.available > 0 ? `${u.name} (only ${u.available} left)` : `${u.name} (unavailable)`))
        .join(", ");


const sendEmail = require("../utils/sendEmail");

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
    const customerName = order.user?.name || "Customer";
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
            <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">${intro}</p>
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

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const reserved = [];
    let orderSaved = false;

    try {
        const { orderItems, address, paymentMethod } = req.body;

        if (!Array.isArray(orderItems) || orderItems.length === 0 || !address) {
            return res.status(400).json({ message: "Invalid order data" });
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

        // 4. Reserve stock atomically. The condition stock >= quantity means two customers
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

        // 5. Build the order from DATABASE prices, never from the browser
        const items = [...wanted].map(([id, quantity]) => ({
            productId: id,
            quantity,
            price: productMap.get(id).price,
        }));
        const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const totalPrice = Math.round((itemsTotal + DELIVERY_FEE) * 100) / 100;

        const order = await Order.create({
            user: req.user._id,
            orderItems: items,
            totalPrice,
            address,
            paymentMethod,
        });
        orderSaved = true;

        // 6. An email failure must not make a saved order look like a failure
        try {
            const populatedOrder = await Order.findById(order._id)
                .populate("user", "name email")
                .populate("orderItems.productId", "name");
            await sendOrderEmail(populatedOrder, "order-confirmed");
        } catch (emailError) {
            console.error("Order confirmation email failed:", emailError);
        }

        res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
        if (!orderSaved && reserved.length) {
            await restoreStock(reserved).catch((e) => console.error("Stock rollback failed:", e));
        }
        res.status(500).json({ message: error.message });
    }
};

const myOrders = async (req, res) => {
    try {
       const orders = await Order.find({ user: req.user._id }).populate(`orderItems.productId`, `name price`);
       res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOrders = async (req, res) =>{
     try {
        const orders = await Order.find().populate(`user`, `id name`);
        res.status(200).json({ orders });
     } catch (error) {
        res.status(500).json({ message: error.message });
     }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ message: "Status is required" });

        const order = await Order.findById(req.params.id)
            .populate("user", "name email")
            .populate("orderItems.productId", "name");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const previousStatus = order.status;

        if (previousStatus === status) {
            return res.json({ message: "Order status unchanged", order });
        }
        // Stock was already returned when it was cancelled, so don't allow reopening
        if (previousStatus === "cancelled") {
            return res.status(400).json({ message: "A cancelled order cannot be reopened" });
        }

        order.status = status;
        await order.save();

        if (status === "cancelled") {
            const items = order.orderItems
                .map((i) => ({ productId: i.productId?._id, quantity: i.quantity }))
                .filter((i) => i.productId); // skip products that were deleted
            await restoreStock(items);
        }

        try {
            await sendOrderEmail(order, status === "cancelled" ? "order-cancelled" : "status-updated");
        } catch (emailError) {
            console.error("Order status email failed:", emailError);
        }

        res.json({ message: "Order status updated", order });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error updating order status" });
    }
};

module.exports = {
    createOrder,
    myOrders,
    getOrders,
    updateOrderStatus
};