require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Product = require("./models/Product");
const Admin = require("./models/Admin");
const image = (text, color) =>
  `https://placehold.co/700x850/${color}/F5F1E8?text=${encodeURIComponent(text)}`;
const products = [
  ...[
    "Classic Black Watch",
    "Silver Chain Watch",
    "Luxury Gold Watch",
    "Chronograph Steel Watch",
    "Executive Black Watch",
    "Minimal Silver Watch",
  ].map((name, i) => ({
    name,
    slug: name.toLowerCase().replace(/ /g, "-"),
    category: "watch",
    brand: "VOTION",
    shortDescription: "Precision made for your everyday signature.",
    description:
      "A considered silhouette with premium finishing and a confident presence.",
    price: 2499 + i * 400,
    discountPrice: 1999 + i * 300,
    stock: 12,
    images: [image(name, "171717")],
    rating: 4.8,
    reviewCount: 24 + i,
    isBestSeller: i < 3,
    isNewArrival: i > 2,
  })),
  ...[
    "Votion Oud",
    "Votion Noir",
    "Votion Fresh",
    "Votion Amber",
    "Votion Elite",
    "Votion Classic",
  ].map((name, i) => ({
    name,
    slug: name.toLowerCase().replace(/ /g, "-"),
    category: "perfume",
    brand: "VOTION",
    shortDescription: "A lasting fragrance with a distinct point of view.",
    description:
      "Layered notes designed to move from first impression to lasting memory.",
    price: 1799 + i * 250,
    discountPrice: 1499 + i * 200,
    stock: 18,
    images: [image(name, "8B1E2D")],
    rating: 4.7,
    reviewCount: 18 + i,
    isBestSeller: i < 3,
    isNewArrival: i > 2,
  })),
];
connectDB()
  .then(async () => {
    await Product.deleteMany({});
    await Product.insertMany(products);
    await Admin.deleteMany({});
    await Admin.create({
      email: process.env.ADMIN_EMAIL || "admin@votion.local",
      passwordHash: await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "change-this-password",
        12,
      ),
    });
    console.log("Demo catalog and admin seeded");
    process.exit();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
