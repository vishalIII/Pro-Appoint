const Service = require("../../models/service/service.model");
const AppError = require("../../utils/appError");

// =======================================================
// Shared validation util
// =======================================================
const validateWeeklyAvailability = (weeklyAvailability) => {
  if (!weeklyAvailability || weeklyAvailability.length === 0) {
    throw new AppError("Weekly availability is required", 400);
  }

  const validDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const providedDays = weeklyAvailability.map((d) => d.day);
  const uniqueDays = new Set(providedDays);

  if (uniqueDays.size !== 7) {
    throw new AppError("All 7 days availability must be provided", 400);
  }

  for (let day of providedDays) {
    if (!validDays.includes(day)) {
      throw new AppError(`Invalid day provided: ${day}`, 400);
    }
  }
};

// =======================================================
// CREATE SERVICE
// =======================================================
exports.createService = async ({
  tenantId,
  name,
  weeklyAvailability,
  category,
  images,
}) => {
  try {
    if (!name || name.trim().length === 0) {
      throw new AppError("Name is required", 400);
    }

    validateWeeklyAvailability(weeklyAvailability);

    return await Service.create({
      tenantId,
      name,
      weeklyAvailability,
      category,
      images,
    });

  } catch (error) {
    throw new AppError(
      error.message || "Failed to create service",
      error.statusCode || 500
    );
  }
};

// =======================================================
// GET SERVICES
// =======================================================
exports.getMyServices = async (tenantId) => {
  try {
    return await Service.find({ tenantId }).sort({ createdAt: -1 });

  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch services",
      error.statusCode || 500
    );
  }
};

// =======================================================
// UPDATE SERVICE
// =======================================================
exports.updateService = async ({
  serviceId,
  tenantId,
  name,
  weeklyAvailability,
  category,
  images,
  isActive,
}) => {
  try {
    if (name !== undefined && name.trim().length === 0) {
      throw new AppError("Name cannot be empty", 400);
    }

    if (weeklyAvailability !== undefined) {
      validateWeeklyAvailability(weeklyAvailability);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (weeklyAvailability !== undefined)
      updateData.weeklyAvailability = weeklyAvailability;
    if (category !== undefined) updateData.category = category;
    if (images !== undefined) updateData.images = images;
    if (isActive !== undefined) updateData.isActive = isActive;

    const service = await Service.findOneAndUpdate(
      { _id: serviceId, tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    return service;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to update service",
      error.statusCode || 500
    );
  }
};
