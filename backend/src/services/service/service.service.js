const Service = require("../../models/service/service.model");

// Shared validation util (internal)
const validateWeeklyAvailability = (weeklyAvailability) => {
  //Presence validation
  if (!weeklyAvailability || weeklyAvailability.length === 0) {
    const error = new Error("Weekly availability is required");
    error.statusCode = 400;
    throw error;
  }

  //Ensuring is all 7 days present
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
    const error = new Error("All 7 days availability must be provided");
    error.statusCode = 400;
    throw error;
  }

  //Validating day names
  for (let day of providedDays) {
    if (!validDays.includes(day)) {
      const error = new Error(`Invalid day provided: ${day}`);
      error.statusCode = 400;
      throw error;
    }
  }
};

//post ---------------------------------------CREATE SERVICE
exports.createService = async ({
  tenantId,
  name,
  weeklyAvailability,
  category,
  images,
}) => {
  // name validation
  if (!name || name.trim().length === 0) {
    const error = new Error("name is required");
    error.statusCode = 400;
    throw error;
  }

  validateWeeklyAvailability(weeklyAvailability);

  // After all validation Creating service
  return await Service.create({
    tenantId,
    name,
    weeklyAvailability,
    category,
    images,
  });
};

//Get ---------------------------------------GET SERVICES
exports.getMyServices = async (tenantId) => {
  const services = await Service.find({ tenantId }).sort({ createdAt: -1 }); // newest first (optional)

  return services;
};

//Patch ---------------------------------------UPDATE SERVICE
exports.updateService = async ({
  serviceId,
  tenantId,
  name,
  weeklyAvailability,
  category,
  images,
  isActive,
}) => {
  if (name !== undefined && name.trim().length === 0) {
    const error = new Error("name cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  if (weeklyAvailability !== undefined) {
    if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
      const error = new Error("Weekly availability cannot be empty");
      error.statusCode = 400;
      throw error;
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

    const days = weeklyAvailability.map((d) => d.day);
    if (new Set(days).size !== 7) {
      const error = new Error("All 7 days availability required");
      error.statusCode = 400;
      throw error;
    }

    for (let day of days) {
      if (!validDays.includes(day)) {
        const error = new Error(`Invalid day: ${day}`);
        error.statusCode = 400;
        throw error;
      }
    }
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
    { new: true, runValidators: true },
  );

  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  return service;
};
