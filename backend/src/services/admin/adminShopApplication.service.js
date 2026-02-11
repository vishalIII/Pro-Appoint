const Shop = require("../../models/shop/shop.model");

// Get all shop applications
exports.getAllShopApplication = async () => {
  try {
    const shops = await Shop.find()
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw error;
  }
};

exports.getPendingShopApplication = async () => {
  try {
    const shops = await Shop.find({status:"pending"})
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .sort({ createdAt: -1 });

    return shops;
  } catch (error) {
    throw error;
  }
};


exports.approveShop = async (shopId) => {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    const error = new Error("Shop not found");
    error.statusCode = 404;
    throw error;
  }

  if (shop.status !== "pending") {
    const error = new Error(
      `Shop is already reviewed and status is ${shop.status}`
    );
    error.statusCode = 400;
    throw error;
  }

  shop.status = "approved";
  shop.statusMeta = undefined;

  await shop.save();

  return shop;
};

exports.rejectShop = async ({ shopId, reason, adminUserId }) => {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    const error = new Error("Shop not found");
    error.statusCode = 404;
    throw error;
  }

  if (shop.status !== "pending") {
    const error = new Error(
      `Shop is already reviewed and status is ${shop.status}`
    );
    error.statusCode = 400;
    throw error;
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
};
