const Tenant = require("../../models/tenant/tenant.model");

module.exports = async (req, res, next) => {
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    return res.status(403).json({ message: "No tenant found" });
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.isActive) {
    return res.status(403).json({ message: "Tenant inactive" });
  }

  // Trial expired
  if (
    tenant.plan === "free" &&
    tenant.planStatus === "trial" &&
    new Date() > tenant.trialEnd
  ) {
    tenant.planStatus = "expired";
    await tenant.save();

    return res.status(403).json({
      message: "Free trial expired. Please upgrade your plan.",
    });
  }

  req.tenant = tenant;
  next();
};
