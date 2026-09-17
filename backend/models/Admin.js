const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Admin", adminSchema);
