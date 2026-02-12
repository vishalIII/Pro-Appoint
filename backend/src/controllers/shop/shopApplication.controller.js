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
    next(error);
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
    

    if (error.code === 11000) {
      return res.status(400).json({
        message: "You already have a pending shop application",
      });
    }

    next(error);
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
    next(error);
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
    next(error);
  }
};
