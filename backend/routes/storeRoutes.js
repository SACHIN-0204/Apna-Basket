const express = require("express");
const { getConfig, getSlots, checkPincode } = require("../controllers/storeController");

const router = express.Router();
router.get("/config", getConfig);
router.get("/slots", getSlots);
router.get("/pincode/:pin", checkPincode);

module.exports = router;
