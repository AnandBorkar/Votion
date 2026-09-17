const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const { uploadImage } = require("../controllers/uploadController");
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) =>
    callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});
router.post("/", protect, upload.single("image"), uploadImage);
module.exports = router;
