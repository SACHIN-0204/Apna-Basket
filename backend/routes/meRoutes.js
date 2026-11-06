const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMe, updateMe, listAddresses, addAddress, updateAddress, deleteAddress } = require("../controllers/meController");

const router = express.Router();

router.use(protect);
router.route("/").get(getMe).put(updateMe);
router.route("/addresses").get(listAddresses).post(addAddress);
router.route("/addresses/:id").put(updateAddress).delete(deleteAddress);

module.exports = router;
