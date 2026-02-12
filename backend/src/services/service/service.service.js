const Service = require("../../models/service/service.model");
const AppError = require("../../utils/appError");

// Shared validation util (internal)
const validateWeeklyAvailability = (weeklyAvailability) => {
  try{
  //Presence validation
  if (!weeklyAvailability || weeklyAvailability.length === 0) {
    throw new AppError("Weekly availability is required", 400);
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
    throw new AppError("All 7 days availability required", 400);
  }

  //Validating day names
  for (let day of providedDays) {
    if (!validDays.includes(day)) {
      throw new AppError(`Invalid day: ${day}`, 400);
    }
  }
}catch(error){
throw new AppError(error.message || "Invalid weekly availability", error.statusCode || 500);
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
  try{
  // name validation
  if (!name || name.trim().length === 0) {
    throw new AppError("Service name is required", 400);
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
}catch(error){
throw new AppError(error.message || "Failed to create service", error.statusCode || 500);
}
};

//Get ---------------------------------------GET SERVICES
exports.getMyServices = async (tenantId) => {
  try{
  const services = await Service.find({ tenantId }).sort({ createdAt: -1 }); // newest first (optional)

  return services;
  }catch(error){
    throw new AppError(error.message || "Failed to fetch services", error.statusCode || 500);
  }
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
  try{
  if (name !== undefined && name.trim().length === 0) {
    throw new AppError("Service name cannot be empty", 400);
  }

  if (weeklyAvailability !== undefined) {
    if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
      throw new AppError("Weekly availability cannot be empty", 400);
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
     throw new AppError("All 7 days availability required", 400);
    }

    for (let day of days) {
      if (!validDays.includes(day)) {
        throw new AppError(`Invalid day: ${day}`, 400);
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
    throw new AppError("Service not found", 404);
  }

  return service;
}catch(error){
throw new AppError(error.message || "Failed to update service", error.statusCode || 500);
}
};
