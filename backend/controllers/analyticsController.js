const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

const getAdminStats = async (req, res) => {
    try {
      const totalUsers = await User.countDocuments({ role: 'user'});
      const totalOrders = await Order.countDocuments({});
      const totalProducts = await Product.countDocuments({});
      
      // Revenue = money actually received: paid orders that were not cancelled
      const [revenue] = await Order.aggregate([
        { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      const totalRevenueData = revenue?.total || 0;

      res.json({
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: totalRevenueData 
      })

    } catch (error) {
        res.status(500).json({ message: "Server error"});
    }
};

module.exports = { getAdminStats }; 