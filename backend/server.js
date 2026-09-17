require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Order = require("./models/Order");
const Admin = require("./models/Admin");
const connectDB = require("./config/db");
const generateOrderId = require("./utils/generateOrderId");
const { protect } = require("./middleware/authMiddleware");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buffer) => {
      if (req.originalUrl === "/api/payments/webhook")
        req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", store: "VOTION" }),
);
app.use("/api/catalog", productRoutes);
app.use("/api/products", productRoutes);
app.use("/api/secure-orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

app.post("/api/contact", (req, res) => {
  const { name, email, phone, message } = req.body || {};
  const safeName = typeof name === "string" ? name.trim() : "";
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const safeMessage = typeof message === "string" ? message.trim() : "";

  if (
    !safeName ||
    !safeEmail ||
    !safeMessage ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)
  ) {
    return res.status(400).json({
      message: "Please provide a valid name, email, and message.",
    });
  }

  return res.status(201).json({
    success: true,
    message:
      "Your enquiry has been received. Our team will contact you shortly.",
    data: {
      name: safeName,
      email: safeEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      message: safeMessage,
    },
  });
});

function calculateShipping(subtotal, paymentMethod = "cod") {
  if (paymentMethod === "online") return 0;
  if (subtotal >= 999) return 0;
  const raw = Math.round(subtotal * 0.012);
  return Math.min(200, Math.max(100, raw));
}

app.post("/api/orders", async (req, res, next) => {
  const topologyType =
    mongoose.connection.getClient()?.topology?.description?.type;
  const session =
    topologyType && topologyType !== "Single"
      ? await mongoose.startSession()
      : null;
  const reserved = [];
  try {
    const {
      customerName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      notes,
      items,
      paymentMethod = "cod",
    } = req.body;
    if (
      !customerName ||
      !phone ||
      !email ||
      !address ||
      !city ||
      !state ||
      !/^\d{6}$/.test(pincode) ||
      !Array.isArray(items) ||
      !items.length
    )
      return res
        .status(400)
        .json({ message: "Please provide valid checkout details" });
    if (paymentMethod !== "cod") {
      return res.status(400).json({
        message: "Online orders must be completed through payment verification",
      });
    }
    if (session) session.startTransaction();
    const ids = items.map((item) => item.productId);
    const products = await Product.find({
      _id: { $in: ids },
      isActive: true,
    }).session(session);
    const byId = new Map(products.map((p) => [String(p._id), p]));
    let subtotal = 0;
    const lineItems = [];
    const stockDeductions = new Map();
    for (const item of items) {
      const product = byId.get(String(item.productId));
      const quantity = Math.max(1, Math.floor(Number(item.quantity)));
      if (!product) throw new Error("Product not found");
      if (product.stock < quantity)
        throw new Error(`${product.name} is out of stock`);
      const price = product.discountPrice || product.price;
      subtotal += price * quantity;
      lineItems.push({
        productId: product._id,
        name: product.name,
        image: product.images[0] || "",
        price,
        quantity,
      });
      const currentTotal = stockDeductions.get(String(product._id)) || 0;
      stockDeductions.set(String(product._id), currentTotal + quantity);
      reserved.push({ productId: product._id, quantity });
    }
    const stockUpdates = await Promise.all(
      [...stockDeductions.entries()].map(([productId, quantity]) =>
        Product.updateOne(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
        ).session(session),
      ),
    );
    for (const [index, update] of stockUpdates.entries()) {
      const productId = [...stockDeductions.keys()][index];
      const product = byId.get(String(productId));
      if (update.modifiedCount !== 1) {
        throw new Error(`${product?.name || "Item"} is out of stock`);
      }
    }
    const shipping = calculateShipping(subtotal, paymentMethod);
    const order = await Order.create(
      [
        {
          orderId: await generateOrderId(),
          customerName,
          phone,
          email,
          address,
          city,
          state,
          pincode,
          notes,
          products: lineItems,
          subtotal,
          shipping,
          discount: 0,
          totalAmount: subtotal + shipping,
          paymentMethod,
          paymentStatus: "Pending",
        },
      ],
      session ? { session } : undefined,
    );
    if (session) await session.commitTransaction();
    res.status(201).json(order[0]);
  } catch (e) {
    if (session) await session.abortTransaction();
    else if (reserved.length)
      await Promise.all(
        reserved.map((item) =>
          Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } },
          ),
        ),
      );
    res.status(400).json({ message: e.message || "Order failed" });
  } finally {
    if (session) await session.endSession();
  }
});
app.post("/api/admin/login", async (req, res) => {
  const admin = await Admin.findOne({ email: req.body.email?.toLowerCase() });
  if (
    !admin ||
    !(await bcrypt.compare(req.body.password || "", admin.passwordHash))
  )
    return res.status(401).json({ message: "Invalid credentials" });
  res.json({
    token: jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    ),
  });
});
app.get("/api/admin/profile", protect, (req, res) => res.json(req.admin));
app.get("/api/orders/:id", async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (e) {
    next(e);
  }
});
app.get("/api/orders", protect, async (req, res, next) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (e) {
    next(e);
  }
});
app.put("/api/orders/:id/status", protect, async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { orderStatus: req.body.orderStatus },
      { new: true },
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (e) {
    next(e);
  }
});
app.use(errorHandler);
const port = process.env.PORT || 5000;
if (require.main === module)
  connectDB()
    .then(() =>
      app.listen(port, "0.0.0.0", () =>
        console.log(`VOTION API listening on ${port}`),
      ),
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
module.exports = app;
