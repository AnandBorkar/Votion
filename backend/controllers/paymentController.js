const crypto = require("crypto");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const generateOrderId = require("../utils/generateOrderId");

function getGateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error("Online payments are not configured");
    error.statusCode = 503;
    throw error;
  }
  let Razorpay;
  try {
    Razorpay = require("razorpay");
  } catch {
    const error = new Error("Online payment dependency is not installed");
    error.statusCode = 503;
    throw error;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function calculateShipping(subtotal, paymentMethod = "cod") {
  if (paymentMethod === "online") return 0;
  if (subtotal >= 999) return 0;
  const raw = Math.round(subtotal * 0.012);
  return Math.min(200, Math.max(100, raw));
}

async function priceItems(items, session, paymentMethod = "cod") {
  if (!Array.isArray(items) || !items.length) {
    const error = new Error("Your cart is empty");
    error.statusCode = 400;
    throw error;
  }
  let productQuery = Product.find({
    _id: { $in: items.map((item) => item.productId) },
    isActive: true,
  });
  if (session) productQuery = productQuery.session(session);
  const products = await productQuery;
  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const lineItems = [];
  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(String(item.productId));
    const quantity = Math.floor(Number(item.quantity));
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 400;
      throw error;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      const error = new Error("Invalid quantity");
      error.statusCode = 400;
      throw error;
    }
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
  }
  const shipping = calculateShipping(
    subtotal,
    paymentMethod,
  );
  return { lineItems, subtotal, shipping, totalAmount: subtotal + shipping };
}

async function createPaymentOrder(req, res, next) {
  try {
    const pricing = await priceItems(
      req.body.items,
      null,
      req.body.paymentMethod || "online",
    );
    const gateway = getGateway();
    const paymentOrder = await gateway.orders.create({
      amount: Math.round(pricing.totalAmount * 100),
      currency: process.env.CURRENCY || "INR",
      receipt: `votion_${Date.now()}`,
      notes: { accountReference: process.env.PAYMENT_ACCOUNT_REFERENCE || "" },
    });
    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentOrderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      pricing,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyPayment(req, res, next) {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;
  if (!orderId || !paymentId || !signature)
    return res.status(400).json({ message: "Incomplete payment confirmation" });
  if (
    !req.body.customerName ||
    !req.body.phone ||
    !req.body.email ||
    !req.body.address ||
    !req.body.city ||
    !req.body.state ||
    !/^\d{6}$/.test(req.body.pincode)
  ) {
    return res
      .status(400)
      .json({ message: "Please provide valid delivery details" });
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid)
    return res.status(400).json({ message: "Payment verification failed" });
  try {
    const existingOrder = await Order.findOne({ paymentReference: paymentId });
    if (existingOrder) return res.json(existingOrder);
    const gateway = getGateway();
    const [payment, paymentOrder] = await Promise.all([
      gateway.payments.fetch(paymentId),
      gateway.orders.fetch(orderId),
    ]);
    const expectedAmount = Math.round(
      (await priceItems(req.body.items, null, req.body.paymentMethod || "online"))
        .totalAmount * 100,
    );
    if (
      payment.order_id !== orderId ||
      paymentOrder.id !== orderId ||
      payment.amount !== expectedAmount ||
      paymentOrder.amount !== expectedAmount ||
      payment.currency !== (process.env.CURRENCY || "INR") ||
      payment.status !== "captured"
    ) {
      return res
        .status(400)
        .json({ message: "Payment details could not be verified" });
    }
  } catch (error) {
    return next(error);
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const pricing = await priceItems(req.body.items, session, req.body.paymentMethod || "online");
    for (const item of pricing.lineItems) {
      const result = await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      ).session(session);
      if (result.modifiedCount !== 1)
        throw new Error(`${item.name} is out of stock`);
    }
    const order = await Order.create(
      [
        {
          orderId: await generateOrderId(),
          customerName: req.body.customerName,
          phone: req.body.phone,
          email: req.body.email,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          pincode: req.body.pincode,
          notes: req.body.notes,
          products: pricing.lineItems,
          subtotal: pricing.subtotal,
          shipping: pricing.shipping,
          discount: 0,
          totalAmount: pricing.totalAmount,
          paymentMethod: "online",
          paymentStatus: "Paid",
          orderStatus: "Confirmed",
          paymentReference: paymentId,
          paymentOrderId: orderId,
        },
      ],
      { session },
    );
    await session.commitTransaction();
    res.status(201).json(order[0]);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
}

function verifyWebhook(req) {
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !secret || !req.rawBody) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex");
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

async function webhook(req, res, next) {
  if (!verifyWebhook(req))
    return res.status(400).json({ message: "Invalid webhook signature" });
  try {
    const event = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;
    if (payment && ["payment.captured", "order.paid"].includes(event)) {
      await Order.findOneAndUpdate(
        {
          $or: [
            { paymentReference: payment.id },
            { paymentOrderId: payment.order_id },
          ],
        },
        {
          paymentStatus: "Paid",
          paymentReference: payment.id,
          paymentOrderId: payment.order_id,
        },
        { new: false },
      );
    }
    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createPaymentOrder, verifyPayment, webhook };
