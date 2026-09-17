const mongoose = require("mongoose");

const catalogMetadataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["group", "category", "brand"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    group: { type: String, default: "", trim: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CatalogMetadata", catalogMetadataSchema);
