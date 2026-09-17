const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  listProducts,
  listAdminProducts,
  getProduct,
  getPublicProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = require("../controllers/productController");
const router = express.Router();
router.get("/", listProducts);
router.get("/admin", protect, listAdminProducts);
router.get("/admin/:id", protect, getProduct);
router.get("/:id", getPublicProduct);
router.post("/", protect, createProduct);
router.put("/:id", protect, updateProduct);
router.patch("/:id/stock", protect, updateStock);
router.delete("/:id", protect, deleteProduct);
module.exports = router;
