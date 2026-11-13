/**
 * One-time, idempotent upgrade for a database created before these fixes.
 *   node scripts/migrate-phase2.js            dry run: shows what would change
 *   node scripts/migrate-phase2.js --apply    writes the changes
 * Never deletes a document.
 *
 *  Orders: createdAt/updatedAt from the old `timestamp`; legacy paymentStatus "pending" ->
 *          payment_pending (Razorpay) / cod_pending (COD); old status "paid" -> pending + paid;
 *          missing statusHistory seeded from the current status.
 *  Users:  createdAt/updatedAt from the _id; any plaintext/legacy OTP wiped (they are hashed now).
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const APPLY = process.argv.includes("--apply");

const run = async () => {
    await connectDB();
    const db = mongoose.connection.db;
    const orders = db.collection("orders");
    const users = db.collection("users");
    const report = {};

    const noDates = await orders.find({ createdAt: { $exists: false } }).project({ timestamp: 1 }).toArray();
    report.ordersMissingCreatedAt = noDates.length;
    if (APPLY) {
        for (const o of noDates) {
            const created = o.timestamp || o._id.getTimestamp();
            await orders.updateOne({ _id: o._id }, { $set: { createdAt: created, updatedAt: created }, $unset: { timestamp: "" } });
        }
    }

    report.legacyPaymentStatus = await orders.countDocuments({ paymentStatus: { $in: ["pending", null] } }) + await orders.countDocuments({ paymentStatus: { $exists: false } });
    report.legacyPaidStatus = await orders.countDocuments({ status: "paid" });
    if (APPLY) {
        await orders.updateMany({ status: "paid" }, { $set: { status: "pending", paymentStatus: "paid" } });
        await orders.updateMany({ paymentMethod: "Razorpay", $or: [{ paymentStatus: "pending" }, { paymentStatus: { $exists: false } }] }, { $set: { paymentStatus: "payment_pending" } });
        await orders.updateMany({ $or: [{ paymentStatus: "pending" }, { paymentStatus: { $exists: false } }] }, { $set: { paymentStatus: "cod_pending" } });
    }

    const noHistory = await orders.find({ statusHistory: { $exists: false } }).project({ status: 1, createdAt: 1 }).toArray();
    report.ordersMissingHistory = noHistory.length;
    if (APPLY) {
        for (const o of noHistory) {
            await orders.updateOne({ _id: o._id }, { $set: { statusHistory: [{ status: o.status || "pending", at: o.createdAt || o._id.getTimestamp(), by: "system", note: "Imported" }] } });
        }
    }

    const noUserDates = await users.find({ createdAt: { $exists: false } }).project({ _id: 1 }).toArray();
    report.usersMissingCreatedAt = noUserDates.length;
    report.usersWithStoredOtp = await users.countDocuments({ otp: { $nin: [null] } });
    if (APPLY) {
        for (const u of noUserDates) {
            const created = u._id.getTimestamp();
            await users.updateOne({ _id: u._id }, { $set: { createdAt: created, updatedAt: created } });
        }
        // Wipes legacy plaintext codes. Customers just request a fresh OTP.
        await users.updateMany({ otp: { $nin: [null] } }, { $set: { otp: null, otpExpires: null, otpAttempts: 0 } });
    }

    console.log(APPLY ? "Applied:" : "Dry run (nothing written). Re-run with --apply to write:", report);
};

run()
    .then(() => mongoose.disconnect())
    .catch(async (e) => { console.error("Migration failed:", e.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
