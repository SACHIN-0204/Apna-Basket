const mongoose = require("mongoose");

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/abhishek-kirana-store";

    try {
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

module.exports = connectDB;