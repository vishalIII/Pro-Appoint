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
    console.error("createTenant error:", error);

    // Known validation / business errors
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
