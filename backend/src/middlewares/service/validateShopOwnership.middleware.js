const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");
const mongoose = require("mongoose")

module.exports = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return next(new AppError("Shop ID is required", 400));
    }

    if (!req.user || !req.user.tenantId) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return next(new AppError("Invalid Shop ID", 400));
    }

    const shop = await Shop.findOne({
      _id: shopId,
      tenantId: req.user.tenantId,
    });

    if (!shop) {
      return next(
        new AppError("Unauthorized access to this shop", 403)
      );
    }

    // Attach shop to request for later use
    req.shop = shop;

    next();
  } catch (error) {
    next(
      new AppError(
        error.message || "Shop validation failed",
        500
      )
    );
  }
};


