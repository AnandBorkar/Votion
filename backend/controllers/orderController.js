const Order = require("../models/Order");
exports.listOrders = async (req, res) =>
  res.json(await Order.find().sort({ createdAt: -1 }));
