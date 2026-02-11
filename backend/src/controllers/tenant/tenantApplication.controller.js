const tenantService = require("../../services/tenant/tenantApplication.service");
const AppError = require("../../utils/appError");

// =======================================================
// Create tenant (apply as service provider)
// =======================================================
exports.createTenant = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await tenantService.createTenant(userId);

    return res.status(201).json({
      message: "Tenant created with 1-month free trial",
      tenantId: result.tenantId,
      trialEndsOn: result.trialEnd,
    });
  } catch (error) {
    next(
      new AppError(
        error.message || "Failed to create tenant",
        error.statusCode || error.status || 500
      )
    );
  }
};
