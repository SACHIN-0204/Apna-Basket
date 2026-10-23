const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    unit: { type: String, trim: true },            // "1 kg", "500 ml", "Pack of 6"
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },                 // optional, for discount badge
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },               // for deleting from Cloudinary
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", brand: "text" });
productSchema.index({ isActive: 1, createdAt: -1 }); // enables search
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);