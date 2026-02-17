const tenantService = require("../../services/tenant/tenantApplication.service");

// =======================================================
// Create tenant (apply as service provider)
// =======================================================
exports.createTenant = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const plan=req.body.plan;
    const result = await tenantService.createTenant(userId,plan);

    return res.status(201).json({
      message: "Tenant created successfully",
      tenantId: result.tenantId,
      subscriptionEndsOn: result.subscriptionEnd,
    });
  } catch (error) {
   next(error);
  }
};
