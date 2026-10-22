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

// @desc    Get all products (supports ?category= & ?search=)
const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: { $ne: false } }; // also matches old products without the field

    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
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

module.exports = { getAdminProducts, getProducts, getProductById, createProduct, updateProduct, deleteProduct };