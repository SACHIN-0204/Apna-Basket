const mongoose = require("mongoose");

// Simple atomic counters (used for short order numbers like AB-10432)
const counterSchema = new mongoose.Schema({
    _id: { type: String },
    seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

Counter.next = async (name, start = 10000) => {
    const doc = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 }, $setOnInsert: {} },
        { new: true, upsert: true }
    );
    // First call returns 1; shift so numbers start at `start + 1`
    return start + doc.seq;
};

module.exports = Counter;
