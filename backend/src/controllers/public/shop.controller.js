const Shop = require("../../models/shop/shop.model");

exports.listShops = async (req, res, next) => {
  try {
    const shops = await Shop.find({ status: "approved" }).sort({ createdAt: -1 });
    return res.status(200).json({ count: shops.length, shops });
  } catch (error) {
    next(error);
  }
};

exports.getShopByIdPublic = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop || shop.status !== "approved") return res.status(404).json({ message: "Shop not found" });
    return res.status(200).json(shop);
  } catch (error) {
    next(error);
  }
};
