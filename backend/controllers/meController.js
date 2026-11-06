const mongoose = require("mongoose");
const User = require("../models/User");
const { normalizePhone } = require("../utils/phone");

const MAX_ADDRESSES = 5;
const LABELS = ["Home", "Work", "Other"];
const clean = (v, max = 250) => String(v ?? "").trim().slice(0, max);

// Validates and normalises an address from the request body. Returns { address } or { error }.
const parseAddress = (body = {}) => {
    const address = {
        label: LABELS.includes(body.label) ? body.label : "Home",
        fullName: clean(body.fullName, 100),
        street: clean(body.street),
        city: clean(body.city, 100),
        state: clean(body.state, 100),
        zipCode: clean(body.zipCode, 10),
        phone: "",
        isDefault: Boolean(body.isDefault),
    };
    if (!address.fullName || !address.street || !address.city || !address.state || !address.zipCode) {
        return { error: "Please fill in all address fields" };
    }
    if (!/^\d{6}$/.test(address.zipCode)) return { error: "Please enter a valid 6-digit PIN code" };
    if (body.phone) {
        const phone = normalizePhone(body.phone);
        if (!phone) return { error: "Please enter a valid 10-digit mobile number" };
        address.phone = phone;
    }
    return { address };
};

// Makes sure exactly one address is the default (when there is at least one)
const fixDefault = (user, preferredId) => {
    if (!user.addresses.length) return;
    const preferred = preferredId ? user.addresses.id(preferredId) : null;
    const chosen = preferred || user.addresses.find((a) => a.isDefault) || user.addresses[0];
    user.addresses.forEach((a) => { a.isDefault = a === chosen; });
};

const getMe = async (req, res) => {
    const u = req.user;
    res.json({ _id: u._id, username: u.username, email: u.email, phone: u.phone, role: u.role });
};

const updateMe = async (req, res) => {
    try {
        const name = clean(req.body?.username, 100);
        if (!name) return res.status(400).json({ message: "Please enter your name" });
        await User.updateOne({ _id: req.user._id }, { $set: { username: name } });
        res.json({ message: "Saved", username: name });
    } catch (error) {
        res.status(500).json({ message: "Could not save your name" });
    }
};

const listAddresses = async (req, res) => {
    const user = await User.findById(req.user._id).select("addresses");
    res.json({ addresses: user?.addresses || [] });
};

const addAddress = async (req, res) => {
    try {
        const { address, error } = parseAddress(req.body);
        if (error) return res.status(400).json({ message: error });

        const user = await User.findById(req.user._id);
        if (user.addresses.length >= MAX_ADDRESSES) {
            return res.status(400).json({ message: `You can save up to ${MAX_ADDRESSES} addresses. Please delete one first.` });
        }
        user.addresses.push(address);
        const added = user.addresses[user.addresses.length - 1];
        // The first address, or one marked as default, becomes the default
        fixDefault(user, address.isDefault || user.addresses.length === 1 ? added._id : null);
        await user.save();
        res.status(201).json({ addresses: user.addresses });
    } catch (e) {
        res.status(500).json({ message: "Could not save the address" });
    }
};

const updateAddress = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Address not found" });
        const { address, error } = parseAddress(req.body);
        if (error) return res.status(400).json({ message: error });

        const user = await User.findById(req.user._id);
        const existing = user.addresses.id(req.params.id);
        if (!existing) return res.status(404).json({ message: "Address not found" });

        existing.set(address);
        fixDefault(user, address.isDefault ? existing._id : null);
        await user.save();
        res.json({ addresses: user.addresses });
    } catch (e) {
        res.status(500).json({ message: "Could not update the address" });
    }
};

const deleteAddress = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Address not found" });
        const user = await User.findById(req.user._id);
        const existing = user.addresses.id(req.params.id);
        if (!existing) return res.status(404).json({ message: "Address not found" });

        existing.deleteOne();
        fixDefault(user, null);
        await user.save();
        res.json({ addresses: user.addresses });
    } catch (e) {
        res.status(500).json({ message: "Could not delete the address" });
    }
};

module.exports = { getMe, updateMe, listAddresses, addAddress, updateAddress, deleteAddress, parseAddress, MAX_ADDRESSES };
