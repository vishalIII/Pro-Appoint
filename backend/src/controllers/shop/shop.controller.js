const shopService = require("../../services/shop/shop.service");

/* --------------------------------------------------
   GET MY SHOPS
-------------------------------------------------- */
exports.getMyShops = async (req, res, next) => {
  try {
    const shops = await shopService.getMyShops({
      tenantId: req.user.tenantId,
    });

    return res.status(200).json({
      count: shops.length,
      shops,
    });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   GET SHOP BY ID
-------------------------------------------------- */
exports.getShopById = async (req, res, next) => {
  try {
    const shop = await shopService.getShopById({
      shopId: req.params.shopId,
      tenantId: req.user.tenantId,
    });

    return res.status(200).json(shop);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   UPDATE SHOP
-------------------------------------------------- */
exports.updateShop = async (req, res, next) => {
  try {
    const shop = await shopService.updateShop({
      shopId: req.params.shopId,
      tenantId: req.user.tenantId,
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

/* --------------------------------------------------
   DELETE SHOP (SOFT DELETE)
-------------------------------------------------- */
exports.deleteShop = async (req, res, next) => {
  try {
    await shopService.deleteShop({
      shopId: req.params.shopId,
      tenantId: req.user.tenantId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      message: "Shop deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
