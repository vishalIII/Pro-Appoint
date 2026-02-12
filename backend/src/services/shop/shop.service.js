const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");
// get own shop ------------------------------------------------------------
exports.getOwnShop = async (shopId) => {
  try{
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new AppError("Shop not found", 404);
  }

  return shop;
}catch(error){
  throw new AppError(error.message || "Failed to fetch shop details", error.statusCode || 500);
}
};

// update own shop ---------------------------------------------------------
exports.updateOwnShop = async ({ shopId, updatePayload }) => {
  try{
  const allowedUpdates = [
    "description",
    "images",
    "contactEmail",
    "contactPhone",
    "address",
    "weeklyAvailability",
  ];

  // ---------- Validate weeklyAvailability (only if provided)
  const { weeklyAvailability } = updatePayload || {};

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
  // ----------------------------------------------------------

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (updatePayload?.[field] !== undefined) {
      updates[field] = updatePayload[field];
    }
  });

  const shop = await Shop.findByIdAndUpdate(
    shopId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!shop) {
   throw new AppError("Shop not found", 404);
  }

  return shop;
}catch(error){
  throw new AppError(error.message || "Failed to update shop details", error.statusCode || 500);
}
};
