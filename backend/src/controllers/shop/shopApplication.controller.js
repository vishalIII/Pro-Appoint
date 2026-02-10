const shopService = require("../../services/shop/shopApplication.service");

// =======================================================
// Get active industries
// =======================================================
// get active industries ====================================================================================
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await shopService.getActiveIndustries();
    return res.status(200).json(industries);
  } catch (error) {
    console.error("getActiveIndustries error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================================================
// Apply for shop
// =======================================================
exports.applyShop = async (req, res) => {
  try {
    const userId = req.user.userId;

    const shop = await shopService.applyShop(userId, req.body);

    return res.status(201).json({
      message: "Shop application submitted successfully",
      shopId: shop._id,
      status: shop.status,
    });
  } catch (error) {
    console.error("applyShop error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "You already have a pending shop application",
      });
    }

    return res.status(400).json({ message: error.message });
  }
};

// =======================================================
// Get shop application status
// =======================================================
exports.getApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const status = await shopService.getShopApplicationStatus(userId);

    return res.status(200).json(status);
  } catch (error) {
    console.error("getApplicationStatus error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// =======================================================
// Get shop application history
// =======================================================
exports.getApplicationHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const history = await shopService.getShopApplicationHistory(userId);

    return res.status(200).json(history);
  } catch (error) {
    console.error("getApplicationHistory error:", error);
    return res.status(400).json({ message: error.message });
  }
};
