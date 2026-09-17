const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { profile } = require("../controllers/adminController");
const {
  listCatalog,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  toggleCatalogStatus,
} = require("../controllers/catalogController");
const router = express.Router();
router.get("/profile", protect, profile);
router.get("/catalog", listCatalog);
router.post("/catalog", protect, createCatalog);
router.put("/catalog/:id", protect, updateCatalog);
router.delete("/catalog/:id", protect, deleteCatalog);
router.patch("/catalog/:id/toggle", protect, toggleCatalogStatus);
module.exports = router;
