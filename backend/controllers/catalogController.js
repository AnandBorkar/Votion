const CatalogMetadata = require("../models/CatalogMetadata");

function slugify(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function sanitizeCatalogPayload(type, body) {
  const name = String(body?.name || "").trim();
  if (!name) throw new Error("Name is required");

  if (type === "category") {
    const groupName = String(body?.group || "").trim();
    if (!groupName) throw new Error("Group is required for categories");
    return {
      type,
      name,
      group: groupName,
      slug: slugify(`${groupName}-${name}`),
      isActive: body?.isActive !== false,
    };
  }

  return {
    type,
    name,
    group: type === "group" ? "" : String(body?.group || "").trim(),
    slug: slugify(name),
    isActive: body?.isActive !== false,
  };
}

exports.listCatalog = async (req, res, next) => {
  try {
    const { type, group, includeInactive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (group) query.group = group;
    if (!includeInactive) query.isActive = true;

    const items = await CatalogMetadata.find(query).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.createCatalog = async (req, res, next) => {
  try {
    const { type } = req.body;
    const payload = sanitizeCatalogPayload(type, req.body);
    const catalog = await CatalogMetadata.create(payload);
    res.status(201).json(catalog);
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
};

exports.updateCatalog = async (req, res, next) => {
  try {
    const catalog = await CatalogMetadata.findById(req.params.id);
    if (!catalog)
      return res.status(404).json({ message: "Catalog item not found" });

    const payload = sanitizeCatalogPayload(catalog.type, {
      ...catalog.toObject(),
      ...req.body,
    });

    const updated = await CatalogMetadata.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true },
    );

    res.json(updated);
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
};

exports.deleteCatalog = async (req, res, next) => {
  try {
    const deleted = await CatalogMetadata.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Catalog item not found" });
    res.json({ message: "Catalog item deleted" });
  } catch (error) {
    next(error);
  }
};

exports.toggleCatalogStatus = async (req, res, next) => {
  try {
    const item = await CatalogMetadata.findById(req.params.id);
    if (!item)
      return res.status(404).json({ message: "Catalog item not found" });

    item.isActive = !item.isActive;
    await item.save();
    res.json(item);
  } catch (error) {
    next(error);
  }
};
