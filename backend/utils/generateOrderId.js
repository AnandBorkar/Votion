const Order = require("../models/Order");
async function generateOrderId() {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments();
  return `VL-${year}-${String(count + 1).padStart(5, "0")}`;
}
module.exports = generateOrderId;
