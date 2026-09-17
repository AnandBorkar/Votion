const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listOrders } = require("../controllers/orderController");
const router = express.Router();
router.get("/", protect, listOrders);
module.exports = router;
