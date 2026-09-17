const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },
    customerName: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    notes: String,
    products: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        image: String,
        price: Number,
        quantity: Number,
      },
    ],
    subtotal: Number,
    shipping: Number,
    discount: Number,
    totalAmount: Number,
    paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
    paymentReference: { type: String, index: true },
    paymentOrderId: { type: String, unique: true, sparse: true, index: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Packed",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
