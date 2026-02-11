const shopService = require("../../services/shop/shopApplication.service");

// =======================================================
// Get Active Industries
// =======================================================
exports.getActiveIndustries = async (req, res, next) => {
  try {
    const industries = await shopService.getActiveIndustries();

    return res.status(200).json({
      success: true,
      data: industries,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Apply for Shop
// =======================================================
exports.applyShop = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const shop = await shopService.applyShop(userId, req.body);

    return res.status(201).json({
      success: true,
      message: "Shop application submitted successfully",
      shopId: shop._id,
      status: shop.status,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Get Shop Application Status
// =======================================================
exports.getApplicationStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const status = await shopService.getShopApplicationStatus(userId);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Get Shop Application History
// =======================================================
exports.getApplicationHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const history = await shopService.getShopApplicationHistory(userId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
