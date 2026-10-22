const express = require("express");
const { protect } = require("../middleware/authMiddleware.js");
const { admin } = require("../middleware/adminMiddleware.js");
const { getProducts, getAdminProducts, getProductById, createProduct, updateProduct, deleteProduct } = require("../controllers/productController.js");
const upload = require("../middleware/upload.js");   // replaces multer + dest

const router = express.Router();

router.get("/admin/all", protect, admin, getAdminProducts);   // put this above "/:id"
router.route("/").get(getProducts).post(protect, admin, upload.single("image"), createProduct);
router.route("/:id").get(getProductById).put(protect, admin, upload.single("image"), updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;