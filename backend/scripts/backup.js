/**
 * Logical backup: exports every collection to JSON (passwords and OTP fields removed).
 *   node scripts/backup.js [outputDir]     default ./backups/<timestamp>
 * A safety net, NOT a replacement for MongoDB Atlas snapshots. Copy the output off the server:
 * Render's disk is erased on every deploy.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const STRIP = ["password", "otp", "otpExpires", "otpAttempts", "otpHash"];

const run = async () => {
    await connectDB();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.resolve(process.argv[2] || path.join(__dirname, "../backups", stamp));
    fs.mkdirSync(dir, { recursive: true });

    for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
        if (name.startsWith("system.") || name === "phoneotps") continue; // short-lived login codes are not worth keeping
        const docs = await mongoose.connection.db.collection(name).find({}).toArray();
        docs.forEach((d) => STRIP.forEach((k) => delete d[k]));
        fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
        console.log(`  ${name}: ${docs.length} documents`);
    }
    console.log(`Backup written to ${dir}`);
};

run()
    .then(() => mongoose.disconnect())
    .catch(async (e) => { console.error("Backup failed:", e.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
