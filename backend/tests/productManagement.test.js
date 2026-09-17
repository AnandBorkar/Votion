const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeProduct } = require("../controllers/productController");

test("normalizeProduct accepts dynamic group, category, gender and brand values", () => {
  const result = normalizeProduct({
    name: "Titan Classic Watch",
    group: "Fashion",
    category: "Watches",
    gender: "Men",
    brand: "Titan",
    price: 2999,
    discountPrice: 2499,
    stock: 4,
    images: ["/images/watch.jpg"],
  });

  assert.equal(result.group, "Fashion");
  assert.equal(result.category, "Watches");
  assert.equal(result.gender, "Men");
  assert.equal(result.brand, "Titan");
  assert.equal(result.slug, "titan-classic-watch");
});
