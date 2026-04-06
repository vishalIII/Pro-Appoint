const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");
const {
  deactivateServicesForShop,
} = require("../service/service.service");
// Get all shop applications
exports.getAllShopApplication = async () => {
  try {
    const shops = await Shop.find()
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .populate("industry", "name isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw new AppError(error.message || "Failed to fetch shop applications", error.statusCode || 500);
  }
};

exports.getPendingShopApplication = async () => {
  try {
    const shops = await Shop.find({status:"pending"})
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .populate("industry", "name isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw new AppError(error.message || "Failed to fetch pending shop applications", error.statusCode || 500);
  }
};


exports.approveShop = async (shopId) => {
  try{
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new AppError("Shop not found", 404);
  }

  if (shop.status !== "pending") {
    throw new AppError("Shop is already reviewed", 400);
  }

  shop.status = "approved";
  shop.statusMeta = undefined;

  await shop.save();

  return shop;
}catch(error){
throw new AppError(error.message || "Failed to approve shop application", error.statusCode || 500);
}
};

exports.rejectShop = async ({ shopId, reason, adminUserId }) => {
  try{
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new AppError("Shop not found", 404);
  }

  if (shop.status !== "pending") {
    throw new AppError("Shop is already reviewed", 400);
  }

  await Shop.findByIdAndUpdate(
    shopId,
    {
      status: "rejected",
      statusMeta: {
        reason: reason || "Rejected by admin",
        by: adminUserId,
        at: new Date(),
      },
    },
    { runValidators: true }
  );

  await deactivateServicesForShop({ shopId });

  return shopId;
}catch(error){
  throw new AppError(error.message || "Failed to reject shop application", error.statusCode || 500);
}
};

exports.suspendShop = async ({ shopId, reason, adminUserId }) => {
  try {
    const shop = await Shop.findById(shopId);

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    if (shop.status === "blocked") {
      throw new AppError("Shop is already suspended", 400);
    }

    await Shop.findByIdAndUpdate(
      shopId,
      {
        status: "blocked",
        statusMeta: {
          reason: reason || "Suspended by admin",
          by: adminUserId,
          at: new Date(),
        },
      },
      { runValidators: true }
    );

    await deactivateServicesForShop({ shopId });

    return shopId;
  } catch (error) {
    throw new AppError(error.message || "Failed to suspend shop", error.statusCode || 500);
  }
};
