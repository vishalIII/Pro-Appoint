const AppError = require("../../utils/appError");
const Tenant = require("../../models/tenant/tenant.model");

module.exports = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return next(new AppError("Tenant not found on user profile", 403));
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.isActive) {
      return next(new AppError("Tenant is inactive", 403));
    }

    if (tenant.subscriptionEnd && new Date() > tenant.subscriptionEnd) {
      if (tenant.planStatus !== "expired") {
        tenant.planStatus = "expired";
        await tenant.save();
      }

      return next(
        new AppError(
          "Your plan expired. Upgrade to continue making changes.",
          403,
          "SUBSCRIPTION_EXPIRED"
        )
      );
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};
