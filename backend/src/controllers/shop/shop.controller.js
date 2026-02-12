const shopService = require("../../services/shop/shop.service");

// get own shop ------------------------------------------------------------
exports.getOwnShop = async (req, res) => {
  try {
    const shop = await shopService.getOwnShop(req.user.shopId);

    return res.status(200).json(shop);
  } catch (error) {
    next(error);
  }
};

// update own shop ---------------------------------------------------------
exports.updateOwnShop = async (req, res) => {
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
