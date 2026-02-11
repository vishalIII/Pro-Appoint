const adminShopApplicationService = require(
  "../../services/admin/adminShopApplication.service"
);

// Get all shop applications (admin)
exports.getAllShopApplication = async (req, res, next) => {
  try {
    const shops =
      await adminShopApplicationService.getAllShopApplication();

    return res.status(200).json(shops);
  } catch (error) {
    next(error);
  }
};

// Get pending shop applications (admin)
exports.getPendingShopApplication = async (req, res, next) => {
  try {
    const shops =
      await adminShopApplicationService.getPendingShopApplication();

    return res.status(200).json(shops);
  } catch (error) {
    next(error);
  }
};

// Approve shop
exports.approveShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const shop =
      await adminShopApplicationService.approveShop(shopId);

    return res.status(200).json({
      message: "Shop approved successfully",
      shopId: shop._id,
    });
  } catch (error) {
    next(error);
  }
};

// Reject shop
exports.rejectShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { reason } = req.body || {};

    await adminShopApplicationService.rejectShop({
      shopId,
      reason,
      adminUserId: req.user.userId,
    });

    return res.status(200).json({
      message: "Shop rejected successfully",
      shopId,
    });
  } catch (error) {
    next(error);
  }
};
