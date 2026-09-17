const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
  webhook,
} = require("../controllers/paymentController");
const router = express.Router();
router.post("/order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.post("/webhook", webhook);
module.exports = router;
