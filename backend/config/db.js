const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Votion MongoDB connected");
}

module.exports = connectDB;
