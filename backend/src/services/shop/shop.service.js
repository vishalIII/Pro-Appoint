const mongoose = require("mongoose");
const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const validateWeeklyAvailability = (weeklyAvailability) => {
  if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length !== 7) {
    throw new AppError("All 7 days availability required", 400);
  }

  const providedDays = weeklyAvailability.map((item) =>
    item?.day?.toLowerCase(),
  );

  if (new Set(providedDays).size !== 7) {
    throw new AppError("Duplicate or missing days in weekly availability", 400);
  }

  for (const day of providedDays) {
    if (!VALID_DAYS.includes(day)) {
      throw new AppError(`Invalid day provided: ${day}`, 400);
    }
  }
};

const getOwnedShop = async ({ shopId, tenantId }) => {
  if (!shopId) {
    throw new AppError("Shop ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError("Invalid Shop ID", 400);
  }

  const shop = await Shop.findOne({
    _id: shopId,
    tenantId,
  });

  if (!shop) {
    throw new AppError("Unauthorized access to this shop", 403);
  }

  return shop;
};

/* --------------------------------------------------
   GET MY SHOPS
-------------------------------------------------- */
exports.getMyShops = async ({ tenantId }) => {
  try {
    if (!tenantId) {
      throw new AppError("Tenant ID is required", 400);
    }

    return await Shop.find({ tenantId }).sort({ createdAt: -1 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch shops", 500);
  }
};

/* --------------------------------------------------
   GET SHOP BY ID
-------------------------------------------------- */
exports.getShopById = async ({ shopId, tenantId }) => {
  try {
    return await getOwnedShop({ shopId, tenantId });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch shop", 500);
  }
};

/* --------------------------------------------------
   UPDATE SHOP
-------------------------------------------------- */
exports.updateShop = async ({ shopId, tenantId, updatePayload }) => {
  try {
    await getOwnedShop({ shopId, tenantId });

    const allowedUpdates = [
      "description",
      "images",
      "contactEmail",
      "contactPhone",
      "address",
      "weeklyAvailability",
    ];

    if (updatePayload?.weeklyAvailability !== undefined) {
      validateWeeklyAvailability(updatePayload.weeklyAvailability);
    }

    const updates = {};

    allowedUpdates.forEach((field) => {
      if (updatePayload?.[field] !== undefined) {
        updates[field] = updatePayload[field];
      }
    });

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    return shop;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to update shop", 500);
  }
};

/* --------------------------------------------------
   DELETE SHOP (SOFT DELETE)
-------------------------------------------------- */
exports.deleteShop = async ({ shopId, tenantId, userId }) => {
  try {
    const shop = await getOwnedShop({ shopId, tenantId });

    if (shop.status === "blocked") {
      throw new AppError("Shop is already deleted", 400);
    }

    await Shop.findByIdAndUpdate(
      shopId,
      {
        $set: {
          status: "blocked",
          statusMeta: {
            reason: "Deleted by owner",
            by: userId,
            at: new Date(),
          },
        },
      },
      { runValidators: true },
    );

    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to delete shop", 500);
  }
};
