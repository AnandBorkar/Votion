const Product = require("../models/Product");

const productListCache = new Map();
const PRODUCT_CACHE_TTL_MS = 30_000;

function invalidateProductListCache() {
  productListCache.clear();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeProduct(body) {
  const name = String(body.name || "").trim();
  const group = String(body.group || "").trim();
  const category = String(body.category || "").trim();
  const gender = String(body.gender || "Unisex").trim();
  const brand = String(body.brand || "VOTION").trim() || "VOTION";
  const price = Number(body.price);
  const discountPrice =
    body.discountPrice === "" || body.discountPrice == null
      ? undefined
      : Number(body.discountPrice);
  const stock = Number(body.stock);

  if (!name) throw new Error("Product name is required");
  if (!group && !body._id) throw new Error("Group is required");
  if (!category) throw new Error("Category is required");
  if (!["Men", "Women", "Unisex", "Kids"].includes(gender))
    throw new Error("Gender must be Men, Women, Unisex, or Kids");
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Price must be greater than zero");
  if (
    discountPrice !== undefined &&
    (!Number.isFinite(discountPrice) ||
      discountPrice < 0 ||
      discountPrice >= price)
  )
    throw new Error("Discount price must be below the regular price");
  if (!Number.isInteger(stock) || stock < 0)
    throw new Error("Stock must be a whole number zero or greater");

  const images = Array.isArray(body.images)
    ? body.images.filter(Boolean)
    : typeof body.images === "string" && body.images
      ? [body.images]
      : [];

  return {
    ...body,
    name,
    group,
    category,
    gender,
    brand,
    price,
    discountPrice,
    stock,
    images,
    slug: (body.slug || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
  };
}

async function getProductList(query, cacheKey) {
  const cached = productListCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < PRODUCT_CACHE_TTL_MS)
    return cached.data;

  const data = await Product.find(query).sort({ createdAt: -1 });
  productListCache.set(cacheKey, { data, timestamp: now });
  return data;
}

exports.listProducts = async (req, res, next) => {
  try {
    const { group, category, gender, brand, search, bestSeller, newArrival } =
      req.query;
    const query = { isActive: true };
    if (group) query.group = group;
    if (category) query.category = category;
    if (gender) query.gender = gender;
    if (brand) query.brand = brand;
    if (search?.trim()) {
      const escapedSearch = escapeRegExp(search.trim());
      query.$or = [
        { name: new RegExp(escapedSearch, "i") },
        { brand: new RegExp(escapedSearch, "i") },
        { category: new RegExp(escapedSearch, "i") },
        { group: new RegExp(escapedSearch, "i") },
        { gender: new RegExp(escapedSearch, "i") },
      ];
    }
    if (bestSeller === "true") query.isBestSeller = true;
    if (newArrival === "true") query.isNewArrival = true;

    const cacheKey = JSON.stringify({
      group: query.group || null,
      category: query.category || null,
      gender: query.gender || null,
      brand: query.brand || null,
      search: search?.trim() || null,
      bestSeller: bestSeller === "true" ? true : null,
      newArrival: newArrival === "true" ? true : null,
    });

    res.json(await getProductList(query, cacheKey));
  } catch (error) {
    next(error);
  }
};
exports.listAdminProducts = async (req, res, next) => {
  try {
    res.json(await Product.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
};
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

module.exports.normalizeProduct = normalizeProduct;
exports.getPublicProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(normalizeProduct(req.body));
    invalidateProductListCache();
    res.status(201).json(product);
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
};
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      normalizeProduct({ ...product.toObject(), ...req.body }),
      { new: true, runValidators: true },
    );
    invalidateProductListCache();
    res.json(updated);
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
};
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    invalidateProductListCache();
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
exports.updateStock = async (req, res, next) => {
  try {
    const stock = Number(req.body.stock);
    if (!Number.isInteger(stock) || stock < 0)
      return res
        .status(400)
        .json({ message: "Stock must be a whole number zero or greater" });
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true },
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};
