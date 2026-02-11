const Shop = require("../../models/shop/shop.model");

// get own shop ------------------------------------------------------------
exports.getOwnShop = async (shopId) => {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    const error = new Error("Shop not found");
    error.statusCode = 404;
    throw error;
  }

  return shop;
};

// update own shop ---------------------------------------------------------
exports.updateOwnShop = async ({ shopId, updatePayload }) => {
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
    const error = new Error("Shop not found");
    error.statusCode = 404;
    throw error;
  }

  return shop;
};
