const mongoose = require("mongoose");
const Product = require("../models/Product.js");
const cloudinary = require("../config/cloudinary.js");

// Only these fields can be set from the request body
const PRODUCT_FIELDS = [
  "name", "description", "brand", "category", "unit",
  "price", "mrp", "stock", "isActive",
];

const pickFields = (body) =>
  PRODUCT_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined && body[key] !== "") acc[key] = body[key];
    return acc;
  }, {});

// Delete an image from Cloudinary without crashing the request if it fails
const removeImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get ALL products including hidden ones (admin only)
const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Sort choices for the shop. In-stock products always come first.
const SORTS = {
  newest: { createdAt: -1 },
  priceLow: { price: 1 },
  priceHigh: { price: -1 },
  name: { name: 1 },
};

const LIST_FIELDS = {
  name: 1, description: 1, brand: 1, category: 1, unit: 1, price: 1, mrp: 1,
  stock: 1, imageUrl: 1, isActive: 1, rating: 1, numReviews: 1, createdAt: 1,
};

// @desc    List products.
//   ?category=  ?search= (name, brand or category)  ?sort=newest|priceLow|priceHigh|name
//   ?ids=a,b,c  (up to 100 specific products, used to refresh the cart)
//   ?page=&limit=  turns on pagination and returns { products, page, limit, total, totalPages, hasMore }
//   Without ?limit the old plain-array response is kept for existing clients.
const getProducts = async (req, res) => {
  try {
    const { category, search, ids, sort } = req.query;
    const filter = { isActive: { $ne: false } }; // also matches old products without the field

    if (ids) {
      const list = String(ids)
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .slice(0, 100)
        .map((id) => new mongoose.Types.ObjectId(id));
      filter._id = { $in: list };
    }
    if (category) filter.category = String(category);
    if (search) {
      const regex = new RegExp(escapeRegex(String(search).trim().slice(0, 60)), "i");
      filter.$or = [{ name: regex }, { brand: regex }, { category: regex }];
    }

    const page = Math.max(Number.parseInt(req.query.page || "1", 10) || 1, 1);
    const requestedLimit = Number.parseInt(req.query.limit || "0", 10) || 0;
    const limit = Math.min(Math.max(requestedLimit, 0), 60);

    if (limit > 0) {
      const sortSpec = SORTS[sort] || SORTS.newest;
      const [products, total] = await Promise.all([
        Product.aggregate([
          { $match: filter },
          { $addFields: { _soldOut: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } } },
          { $sort: { _soldOut: 1, ...sortSpec, _id: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: LIST_FIELDS },
        ]).collation({ locale: "en", strength: 2 }),
        Product.countDocuments(filter),
      ]);

      return res.status(200).json({
        products,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    }

    // Legacy array response
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .select(Object.keys(LIST_FIELDS).join(" "))
      .lean();
    res.status(200).json(products);
  } catch (error) {
    console.error("getProducts failed:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Category names that currently have visible products
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: { $ne: false } });
    res.status(200).json(categories.filter(Boolean).sort((a, b) => a.localeCompare(b)));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new product
const createProduct = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Product image is required" });
    }
    const product = await Product.create({
      ...pickFields(req.body),
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
    });
    res.status(201).json(product);
  } catch (err) {
    if (req.file) await removeImage(req.file.filename); // don't leave an orphan upload
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// @desc    Update a product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) await removeImage(req.file.filename);
      return res.status(404).json({ message: "Product not found" });
    }

    const oldPublicId = product.imagePublicId;
    Object.assign(product, pickFields(req.body));

    if (req.file) {
      product.imageUrl = req.file.path;
      product.imagePublicId = req.file.filename;
    }

    await product.save();
    if (req.file) await removeImage(oldPublicId); // delete the old image only after a successful save
    res.json(product);
  } catch (err) {
    if (req.file) await removeImage(req.file.filename);
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// @desc    Delete a product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    await removeImage(product.imagePublicId);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAdminProducts, getProducts, getCategories, getProductById, createProduct, updateProduct, deleteProduct };