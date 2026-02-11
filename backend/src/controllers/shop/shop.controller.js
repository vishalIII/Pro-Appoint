const shopService = require("../../services/shop/shop.service");

// =======================================================
// Get Own Shop
// =======================================================
exports.getOwnShop = async (req, res, next) => {
  try {
    const shop = await shopService.getOwnShop(req.user.shopId);

    return res.status(200).json(shop);
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Update Own Shop
// =======================================================
exports.updateOwnShop = async (req, res, next) => {
  try {
    const shop = await shopService.updateOwnShop({
      shopId: req.user.shopId,
      updatePayload: req.body,
    });

    return res.status(200).json({
      message: "Shop updated successfully",
      shop,
    });
  } catch (error) {
    next(error);
  }
};
