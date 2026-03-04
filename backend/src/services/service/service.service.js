const mongoose = require("mongoose");
const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");
const {
  validateServiceWeeklyAvailability,
} = require("../../utils/availability");

const HUMAN_RESOURCE_TYPE_CANONICAL_MAP = {
  instructor: "staff",
};

const normalizeResourceType = (type) => {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : "";
  return HUMAN_RESOURCE_TYPE_CANONICAL_MAP[normalized] || normalized;
};

/* --------------------------------------------------
   Helper: Validate Shop Ownership
-------------------------------------------------- */
const validateShopOwnership = async (shopId, tenantId) => {
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError("Invalid Shop ID", 400);
  }

  const shop = await Shop.findOne({
    _id: shopId,
    tenantId: tenantId,
  });

  if (!shop) {
    throw new AppError("Unauthorized access to this shop", 403);
  }

  if (shop.status !== "approved") {
    throw new AppError(
      "Shop must be approved before creating services",
      400
    );
  }

  return shop;
};

const normalizeRequiredResources = (requiredResources) => {
  if (!Array.isArray(requiredResources) || requiredResources.length === 0) {
    throw new AppError("requiredResources is required", 400);
  }

  const aggregated = new Map();

  for (const item of requiredResources) {
    const type = normalizeResourceType(item?.type);
    const quantity = Number(item?.quantity);

    if (!type) {
      throw new AppError("Resource type is required", 400);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        `Invalid resource quantity for type ${type}`,
        400,
      );
    }

    aggregated.set(type, (aggregated.get(type) || 0) + quantity);
  }

  return [...aggregated.entries()].map(([type, quantity]) => ({
    type,
    quantity,
  }));
};

/* --------------------------------------------------
   CREATE SERVICE
-------------------------------------------------- */
exports.createService = async ({
  tenantId,
  shopId,
  name,
  description,
  weeklyAvailability,
  category,
  images,
  capacity,
  discountPercentage,
  price,
  durationMinutes,
  requiredResources,
}) => {
  try {
    if (!tenantId) throw new AppError("Tenant ID is required", 400);
    if (!shopId) throw new AppError("Shop ID is required", 400);

    const shop = await validateShopOwnership(shopId, tenantId);

    if (!name || name.trim().length === 0) {
      throw new AppError("Service name is required", 400);
    }

    if (price === undefined || price < 0) {
      throw new AppError("Valid price is required", 400);
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new AppError("durationMinutes must be a positive integer", 400);
    }

    const normalizedRequiredResources =
      normalizeRequiredResources(requiredResources);

    const normalizedWeeklyAvailability = validateServiceWeeklyAvailability({
      weeklyAvailability,
      shopWeeklyAvailability: shop.weeklyAvailability,
    });

    return await Service.create({
      shopId,
      name,
      description,
      weeklyAvailability: normalizedWeeklyAvailability,
      category,
      images,
      capacity,
      discountPercentage,
      price,
      durationMinutes,
      requiredResources: normalizedRequiredResources,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to create service", 500);
  }
};

/* --------------------------------------------------
   GET SERVICES
-------------------------------------------------- */
exports.getMyServices = async ({ tenantId, shopId }) => {
  try {
    await validateShopOwnership(shopId, tenantId);

    return await Service.find({
      shopId,
      isActive: true,
    }).sort({ createdAt: -1 });
  } catch (error) {
    throw new AppError(error.message || "Failed to fetch services", 500);
  }
};

/* --------------------------------------------------
   GET SERVICE BY ID
-------------------------------------------------- */
exports.getServiceById = async ({ tenantId, shopId, serviceId }) => {
  try {
    if (!serviceId) {
      throw new AppError("Service ID is required", 400);
    }

    await validateShopOwnership(shopId, tenantId);

    const service = await Service.findOne({
      _id: serviceId,
      shopId,
      isActive: true,
    });

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    return service;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch service", 500);
  }
};

/* --------------------------------------------------
   UPDATE SERVICE
-------------------------------------------------- */
exports.updateService = async ({
  tenantId,
  shopId,
  serviceId,
  name,
  description,
  weeklyAvailability,
  category,
  images,
  isActive,
  capacity,
  discountPercentage,
  price,
  durationMinutes,
  requiredResources,
}) => {
  try {
    const shop = await validateShopOwnership(shopId, tenantId);

    const updateData = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        throw new AppError("Service name cannot be empty", 400);
      }
      updateData.name = name;
    }

    if (description !== undefined)
      updateData.description = description;

    if (weeklyAvailability !== undefined) {
      updateData.weeklyAvailability = validateServiceWeeklyAvailability({
        weeklyAvailability,
        shopWeeklyAvailability: shop.weeklyAvailability,
      });
    }

    if (category !== undefined)
      updateData.category = category;

    if (images !== undefined)
      updateData.images = images;

    if (isActive !== undefined)
      updateData.isActive = isActive;

    if (capacity !== undefined) {
      if (capacity < 1)
        throw new AppError("Capacity must be at least 1", 400);
      updateData.capacity = capacity;
    }

    if (discountPercentage !== undefined) {
      if (discountPercentage < 0 || discountPercentage > 100)
        throw new AppError("Discount must be 0–100%", 400);
      updateData.discountPercentage = discountPercentage;
    }

    if (price !== undefined) {
      if (price < 0)
        throw new AppError("Price cannot be negative", 400);
      updateData.price = price;
    }

    if (durationMinutes !== undefined) {
      if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        throw new AppError(
          "durationMinutes must be a positive integer",
          400,
        );
      }
      updateData.durationMinutes = durationMinutes;
    }

    if (requiredResources !== undefined) {
      updateData.requiredResources =
        normalizeRequiredResources(requiredResources);
    }

    const service = await Service.findOneAndUpdate(
      { _id: serviceId, shopId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    return service;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to update service", 500);
  }
};

/* --------------------------------------------------
   DELETE SERVICE (Soft Delete)
-------------------------------------------------- */
exports.deleteService = async ({ tenantId, shopId, serviceId }) => {
  try {
    await validateShopOwnership(shopId, tenantId);

    const service = await Service.findOneAndUpdate(
      {
        _id: serviceId,
        shopId,
        isActive: true,
      },
      {
        $set: { isActive: false },
      },
      { new: true }
    );

    if (!service) {
      throw new AppError("Service not found or already deleted", 404);
    }

    return service;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to delete service", 500);
  }
};
