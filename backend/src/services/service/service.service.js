const mongoose = require("mongoose");
const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const Appointment = require("../../models/appointment/appointment.model");
const AppError = require("../../utils/appError");
const {
  validateServiceWeeklyAvailability,
} = require("../../utils/availability");

const APPROVED_SHOP_STATUS = "approved";

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
const validateShopOwnership = async ({
  shopId,
  tenantId,
  requireApproved = false,
  actionLabel = "perform this action",
}) => {
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

  if (requireApproved && shop.status !== APPROVED_SHOP_STATUS) {
    throw new AppError(
      `Shop must be approved to ${actionLabel}`,
      400,
    );
  }

  return shop;
};

const deactivateServicesForShop = async ({ shopId }) => {
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return 0;
  }

  const result = await Service.updateMany(
    {
      shopId,
      isActive: true,
    },
    {
      $set: { isActive: false },
    },
  );

  return Number(result?.modifiedCount || 0);
};

exports.deactivateServicesForShop = deactivateServicesForShop;

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

const normalizeClosedPeriods = (closedPeriods) => {
  if (closedPeriods === undefined) return undefined;
  if (!Array.isArray(closedPeriods)) {
    throw new AppError("closedPeriods must be an array", 400);
  }

  return closedPeriods.map((period, index) => {
    const startDate = new Date(period?.startDate);
    const endDate = new Date(period?.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError(`Invalid closed period dates at index ${index}`, 400);
    }

    if (startDate > endDate) {
      throw new AppError(
        `closedPeriods startDate must be before endDate at index ${index}`,
        400,
      );
    }

    return {
      startDate,
      endDate,
      reason:
        typeof period?.reason === "string" && period.reason.trim()
          ? period.reason.trim()
          : "Service is closed",
    };
  });
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
  closedPeriods,
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

    const shop = await validateShopOwnership({
      shopId,
      tenantId,
      requireApproved: true,
      actionLabel: "create services",
    });

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
    const normalizedClosedPeriods = normalizeClosedPeriods(closedPeriods);

    return await Service.create({
      shopId,
      name,
      description,
      weeklyAvailability: normalizedWeeklyAvailability,
      ...(normalizedClosedPeriods !== undefined
        ? { closedPeriods: normalizedClosedPeriods }
        : {}),
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
    const shop = await validateShopOwnership({
      shopId,
      tenantId,
    });

    if (shop.status !== APPROVED_SHOP_STATUS) {
      await deactivateServicesForShop({ shopId });
    }

    return await Service.find({
      shopId,
    }).sort({ isActive: -1, createdAt: -1 });
  } catch (error) {
    if (error instanceof AppError) throw error;
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

    await validateShopOwnership({
      shopId,
      tenantId,
      requireApproved: true,
      actionLabel: "view services",
    });

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
  closedPeriods,
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
    const shop = await validateShopOwnership({
      shopId,
      tenantId,
      requireApproved: true,
      actionLabel: "update services",
    });

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

    if (closedPeriods !== undefined) {
      updateData.closedPeriods = normalizeClosedPeriods(closedPeriods);
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
    await validateShopOwnership({
      shopId,
      tenantId,
      requireApproved: true,
      actionLabel: "delete services",
    });

    const activeFutureAppointments = await Appointment.countDocuments({
      shopId,
      serviceId,
      status: { $in: ["pending", "confirmed"] },
      startTimeUTC: { $gte: new Date() },
    });

    if (activeFutureAppointments > 0) {
      throw new AppError(
        "Cannot delete service with upcoming appointments. Deactivate it instead.",
        409,
      );
    }

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
