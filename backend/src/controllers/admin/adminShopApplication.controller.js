const adminShopApplicationService = require(
  "../../services/admin/adminShopApplication.service"
);

// Get all shop applications (admin)
exports.getAllShopApplication = async (req, res) => {
  try {
    const shops = await adminShopApplicationService.getAllShopApplication();
    return res.status(200).json(shops);
  } catch (error) {
    return res.status(500).json({ 
      message: error.message   
    });
  }
};

// Get all shop applications (admin)
exports.getPendingShopApplication = async (req, res) => {
  try {
    const shops = await adminShopApplicationService.getPendingShopApplication();
    return res.status(200).json(shops);
  } catch (error) {
    return res.status(500).json({ 
      message: error.message   
    });
  }
};


// patch Approve shop 
exports.approveShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop =
      await adminShopApplicationService.approveShop(shopId);

    return res.status(200).json({
      message: "Shop approved successfully",
      shopId: shop._id,
    });
  } catch (error) {
    console.error("approveShop error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

// patch Reject shop 
exports.rejectShop = async (req, res) => {
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
    console.error("rejectShop error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};
