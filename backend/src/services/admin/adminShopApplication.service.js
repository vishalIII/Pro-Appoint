const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");

// Get all shop applications
exports.getAllShopApplication = async () => {
  try {
    const shops = await Shop.find()
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch shop applications",
      error.statusCode || 500
    );
  }
};

// Get pending shop applications
exports.getPendingShopApplication = async () => {
  try {
    const shops = await Shop.find({ status: "pending" })
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch pending shop applications",
      error.statusCode || 500
    );
  }
};

// Approve shop
exports.approveShop = async (shopId) => {
  try {
    const shop = await Shop.findById(shopId);

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    if (shop.status !== "pending") {
      throw new AppError(
        `Shop is already reviewed and status is ${shop.status}`,
        400
      );
    }

    shop.status = "approved";
    shop.statusMeta = undefined;

    await shop.save();

    return shop;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to approve shop",
      error.statusCode || 500
    );
  }
};

// Reject shop
exports.rejectShop = async ({ shopId, reason, adminUserId }) => {
  try {
    const shop = await Shop.findById(shopId);

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    if (shop.status !== "pending") {
      throw new AppError(
        `Shop is already reviewed and status is ${shop.status}`,
        400
      );
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

    return shopId;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to reject shop",
      error.statusCode || 500
    );
  }
};
