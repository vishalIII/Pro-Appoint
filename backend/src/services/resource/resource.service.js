const mongoose = require("mongoose");
const AppError = require("../../utils/appError");
const Shop = require("../../models/shop/shop.model");
const Resource = require("../../models/resource/resource.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const HUMAN_RESOURCE_TYPE_CANONICAL_MAP = {
  instructor: "staff",
};

const RESOURCE_TYPE_ALIASES = {
  staff: ["staff", "instructor"],
};

const normalizeResourceType = (type) => {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : "";
  return HUMAN_RESOURCE_TYPE_CANONICAL_MAP[normalized] || normalized;
};

const getResourceTypeAliases = (normalizedType) =>
  RESOURCE_TYPE_ALIASES[normalizedType] || [normalizedType];

const validateShopOwnership = async ({ shopId, tenantId }) => {
  if (!isValidObjectId(shopId)) {
    throw new AppError("Invalid Shop ID", 400);
  }

  const shop = await Shop.findOne({ _id: shopId, tenantId }).select(
    "_id status tenantId",
  );

  if (!shop) {
    throw new AppError("Unauthorized access to this shop", 403);
  }

  return shop;
};

exports.createResource = async ({
  tenantId,
  shopId,
  name,
  type,
  capacity,
  metadata,
}) => {
  await validateShopOwnership({ shopId, tenantId });

  if (!name || !name.trim()) {
    throw new AppError("Resource name is required", 400);
  }

  const normalizedType = normalizeResourceType(type);
  if (!normalizedType) {
    throw new AppError("Resource type is required", 400);
  }

  const normalizedCapacity =
    capacity === undefined ? 1 : Number(capacity);
  if (!Number.isFinite(normalizedCapacity) || normalizedCapacity < 1) {
    throw new AppError("Resource capacity must be at least 1", 400);
  }

  const resource = await Resource.create({
    tenantId,
    shopId,
    name: name.trim(),
    type: normalizedType,
    capacity: Math.floor(normalizedCapacity),
    metadata,
  });

  return resource;
};

exports.getResources = async ({ tenantId, shopId, type, isActive }) => {
  await validateShopOwnership({ shopId, tenantId });

  const query = { tenantId, shopId };

  const normalizedType = normalizeResourceType(type);
  if (normalizedType) {
    const aliases = getResourceTypeAliases(normalizedType);
    query.type = aliases.length === 1 ? aliases[0] : { $in: aliases };
  }

  if (isActive !== undefined) {
    query.isActive = isActive === true || isActive === "true";
  }

  return Resource.find(query).sort({ type: 1, name: 1 });
};

exports.updateResource = async ({
  tenantId,
  shopId,
  resourceId,
  updatePayload,
}) => {
  await validateShopOwnership({ shopId, tenantId });

  if (!isValidObjectId(resourceId)) {
    throw new AppError("Invalid Resource ID", 400);
  }

  const updateData = {};

  if (updatePayload.name !== undefined) {
    if (!updatePayload.name || !updatePayload.name.trim()) {
      throw new AppError("Resource name cannot be empty", 400);
    }
    updateData.name = updatePayload.name.trim();
  }

  if (updatePayload.type !== undefined) {
    const normalizedType = normalizeResourceType(updatePayload.type);
    if (!normalizedType) {
      throw new AppError("Resource type is required", 400);
    }
    updateData.type = normalizedType;
  }

  if (updatePayload.capacity !== undefined) {
    const normalizedCapacity = Number(updatePayload.capacity);
    if (!Number.isFinite(normalizedCapacity) || normalizedCapacity < 1) {
      throw new AppError("Resource capacity must be at least 1", 400);
    }
    updateData.capacity = Math.floor(normalizedCapacity);
  }

  if (updatePayload.isActive !== undefined) {
    updateData.isActive =
      updatePayload.isActive === true || updatePayload.isActive === "true";
  }

  if (updatePayload.metadata !== undefined) {
    updateData.metadata = updatePayload.metadata;
  }

  const resource = await Resource.findOneAndUpdate(
    { _id: resourceId, tenantId, shopId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!resource) {
    throw new AppError("Resource not found", 404);
  }

  return resource;
};

exports.deleteResource = async ({ tenantId, shopId, resourceId }) => {
  await validateShopOwnership({ shopId, tenantId });

  if (!isValidObjectId(resourceId)) {
    throw new AppError("Invalid Resource ID", 400);
  }

  const resource = await Resource.findOneAndUpdate(
    { _id: resourceId, tenantId, shopId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!resource) {
    throw new AppError("Resource not found or already inactive", 404);
  }

  return resource;
};
