const express = require("express");
const rateLimit = require("express-rate-limit");
const { chat } = require("../controllers/chatController");

const router = express.Router();
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
});
router.post("/", chatLimiter, chat);

module.exports = router;
