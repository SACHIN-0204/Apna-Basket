const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const settings = require("../config/settings");
const { calculateTotals, isStudentEmail, normalizeEmail } = require("../utils/pricing");
const { normalizePhone } = require("../utils/phone");
const { sendOrderEmail, sendOrderEmailById } = require("../utils/orderEmail");

// Put reserved stock back (used on cancel, expiry or failure)
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

const cleanText = (v, max = 200) => String(v ?? "").trim().slice(0, max);

// ---------------------------------------------------------------------------
// Shared pricing step: used by both the quote and the real order, so the customer
// is always charged exactly what the quote showed.
// ---------------------------------------------------------------------------
const priceCart = async (orderItems) => {
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return { error: { status: 400, message: "Your cart is empty" } };
    }

    // 1. Validate ids and quantities, merge duplicate products
    const wanted = new Map();
    for (const item of orderItems) {
        const id = String(item.productId?._id || item.productId || "");
        const quantity = Number(item.quantity);
        if (!mongoose.Types.ObjectId.isValid(id) || !Number.isInteger(quantity) || quantity < 1) {
            return { error: { status: 400, message: "Invalid order item" } };
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

    // 4. Prices come from the database, never from the browser
    const items = [...wanted]
        .filter(([id]) => productMap.has(id))
        .map(([id, quantity]) => ({ productId: id, quantity, price: productMap.get(id).price }));
    const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return { wanted, productMap, items, itemsTotal, unavailable };
};

// @desc    Price a cart without creating anything (shown on the checkout page)
// @route   POST /api/orders/quote
// @access  Public
const quoteOrder = async (req, res) => {
    try {
        const { orderItems, studentEmail } = req.body || {};
        const priced = await priceCart(orderItems);
        if (priced.error) return res.status(priced.error.status).json({ message: priced.error.message });

        const studentEmailGiven = Boolean(cleanText(studentEmail));
        const totals = calculateTotals(priced.itemsTotal, { studentEmail });

        res.status(200).json({
            ...totals,
            studentEmailValid: studentEmailGiven ? isStudentEmail(studentEmail) : null,
            unavailable: priced.unavailable,
        });
    } catch (error) {
        res.status(500).json({ message: "Could not calculate your total" });
    }
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const reserved = [];
    let orderSaved = false;

    try {
        const { orderItems, address, paymentMethod, contactPhone, studentEmail } = req.body || {};

        // Delivery details
        if (!address || typeof address !== "object") {
            return res.status(400).json({ message: "Delivery address is required" });
        }
        const cleanAddress = {
            fullName: cleanText(address.fullName, 100),
            street: cleanText(address.street, 250),
            city: cleanText(address.city, 100),
            state: cleanText(address.state, 100),
            zipCode: cleanText(address.zipCode, 10),
        };
        if (Object.values(cleanAddress).some((v) => !v)) {
            return res.status(400).json({ message: "Please fill in all delivery address fields" });
        }
        if (!/^\d{6}$/.test(cleanAddress.zipCode)) {
            return res.status(400).json({ message: "Please enter a valid 6-digit PIN code" });
        }
        const phone = normalizePhone(contactPhone ?? address.phone);
        if (!phone) {
            return res.status(400).json({ message: "Please enter a valid 10-digit mobile number so we can reach you for delivery" });
        }

        const method = paymentMethod || "Cash on Delivery";
        if (!settings.PAYMENT_METHODS.includes(method)) {
            return res.status(400).json({ message: "Unsupported payment method" });
        }

        const studentEmailGiven = Boolean(cleanText(studentEmail));
        if (studentEmailGiven && !isStudentEmail(studentEmail)) {
            return res.status(400).json({
                message: "The student discount needs a college email (for example name@college.ac.in or name@college.edu).",
            });
        }

        // Price and check stock
        const priced = await priceCart(orderItems);
        if (priced.error) return res.status(priced.error.status).json({ message: priced.error.message });
        if (priced.unavailable.length) {
            return res.status(409).json({ message: stockMessage(priced.unavailable), unavailable: priced.unavailable });
        }

        // Reserve stock atomically. The condition stock >= quantity means two customers
        // can never both buy the last item.
        for (const [id, quantity] of priced.wanted) {
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

        // Totals: one calculation, on the server
        const totals = calculateTotals(priced.itemsTotal, { studentEmail });
        const online = method === "Razorpay";

        const order = await Order.create({
            user: req.user._id,
            orderItems: priced.items,
            itemsTotal: totals.itemsTotal,
            deliveryFee: totals.deliveryFee,
            discount: totals.discount,
            totalPrice: totals.totalPrice,
            studentEmail: totals.studentDiscountApplied ? normalizeEmail(studentEmail) : "",
            address: cleanAddress,
            contactPhone: phone,
            paymentMethod: method,
            paymentStatus: online ? "payment_pending" : "cod_pending",
            expiresAt: online ? new Date(Date.now() + settings.PAYMENT_HOLD_MINUTES * 60 * 1000) : null,
        });
        orderSaved = true;

        // Cash on Delivery is confirmed now. Online orders are confirmed when the payment succeeds.
        // Not awaited: a slow mail server must never hold up the customer's checkout.
        if (!online) sendOrderEmailById(order._id, "order-confirmed");

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
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate("orderItems.productId", "name price");
        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate("user", "username email")
            .populate("orderItems.productId", "name");
        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change an order's status (admin)
// @route   PUT /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!status) return res.status(400).json({ message: "Status is required" });
        if (!Order.ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${Order.ORDER_STATUSES.join(", ")}` });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: "Order not found" });
        }

        const order = await Order.findById(req.params.id)
            .populate("user", "username email")
            .populate("orderItems.productId", "name");

        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.status === status) {
            return res.json({ message: "Order status unchanged", order });
        }
        // Stock was already returned when it was cancelled, so don't allow reopening
        if (order.status === "cancelled") {
            return res.status(400).json({ message: "A cancelled order cannot be reopened" });
        }

        if (status === "cancelled") {
            // Money already taken? Flag it for a manual refund. Unpaid online attempt? Mark failed.
            const nextPayment =
                order.paymentStatus === "paid" ? "refund_pending"
                : order.paymentStatus === "payment_pending" ? "failed"
                : order.paymentStatus;

            // Conditional update: only one request can cancel, so stock is returned exactly once
            const result = await Order.updateOne(
                { _id: order._id, status: { $ne: "cancelled" } },
                { $set: { status: "cancelled", paymentStatus: nextPayment, expiresAt: null } }
            );
            if (result.modifiedCount === 0) {
                return res.status(409).json({ message: "This order was just cancelled" });
            }
            order.status = "cancelled";
            order.paymentStatus = nextPayment;

            const items = order.orderItems
                .map((i) => ({ productId: i.productId?._id, quantity: i.quantity }))
                .filter((i) => i.productId); // skip products that were deleted
            await restoreStock(items);
        } else {
            order.status = status;
            // Cash is collected at the door, so a delivered COD order counts as paid
            if (status === "delivered" && order.paymentMethod === "Cash on Delivery") {
                order.paymentStatus = "paid";
            }
            await order.save();
        }

        // Not awaited, and errors are only logged
        sendOrderEmail(order, status === "cancelled" ? "order-cancelled" : "status-updated")
            .catch((emailError) => console.error("Order status email failed:", emailError.message));

        res.json({ message: "Order status updated", order });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error updating order status" });
    }
};

// Cancels online orders that were never paid and returns their stock.
// Called on a timer from index.js. Safe to run on several servers at once.
const expireUnpaidOrders = async () => {
    const stale = await Order.find({
        paymentStatus: "payment_pending",
        status: { $ne: "cancelled" },
        expiresAt: { $lt: new Date() },
    })
        .select("_id orderItems")
        .limit(50)
        .lean();

    let expired = 0;
    for (const order of stale) {
        // If a payment is confirmed at the same moment, only one of the two updates can win
        const result = await Order.updateOne(
            { _id: order._id, paymentStatus: "payment_pending", status: { $ne: "cancelled" } },
            { $set: { status: "cancelled", paymentStatus: "failed", expiresAt: null } }
        );
        if (result.modifiedCount === 1) {
            await restoreStock(order.orderItems.map((i) => ({ productId: i.productId, quantity: i.quantity })));
            expired += 1;
        }
    }
    return expired;
};

module.exports = {
    quoteOrder,
    createOrder,
    myOrders,
    getOrders,
    updateOrderStatus,
    expireUnpaidOrders,
};
