const tenantService = require("../../services/tenant/tenantApplication.service");

// =======================================================
// Create tenant (apply as service provider)
// =======================================================
exports.createTenant = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await tenantService.createTenant(userId);

    return res.status(201).json({
      message: "Tenant created with 1-month free trial",
      tenantId: result.tenantId,
      trialEndsOn: result.trialEnd,
    });
  } catch (error) {
   next(error);
  }
};
