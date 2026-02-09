const Shop = require("../../models/shop/shop.model");
const User = require("../../models/user/user.model");

// Get all shop applications (admin)
exports.getAllShopApplications = async (req, res) => {
  try {
    const shops = await Shop.find()
      .populate("ownerId", "name email role")
      .populate("tenantId", "plan isActive")
      .sort({ createdAt: -1 });

    return res.status(200).json(shops);
  } catch (error) {
    console.error("getAllShopApplications error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Approve shop
exports.approveShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.status !== "pending") {
      return res.status(400).json({
        message: `Shop is already reviewed and status is ${shop.status}`,
      });
    }

    shop.status = "approved";
    shop.statusMeta = undefined;

    await shop.save();

    return res.status(200).json({
      message: "Shop approved successfully",
      shopId: shop._id,
    });
  } catch (error) {
    console.error("approveShop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reject shop
exports.rejectShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { reason } = req.body || {};

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.status !== "pending") {
      return res.status(400).json({
        message: `Shop is already reviewed and status is ${shop.status}`,
      });
    }

    await Shop.findByIdAndUpdate(
      shopId,
      {
        status: "rejected",
        statusMeta: {
          reason: reason || "Rejected by admin",
          by: req.user.userId,
          at: new Date(),
        },
      },
      { runValidators: true },
    );

    return res.status(200).json({
      message: "Shop rejected successfully",
      shopId,
    });
  } catch (error) {
    console.error("rejectShop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
