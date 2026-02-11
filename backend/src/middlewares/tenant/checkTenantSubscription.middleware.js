const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");

module.exports = async (req, res, next) => {
  const userId = req.user.userId;

  const user = await User.findById(userId);
  if (!user || !user.tenantId) {
    return res.status(403).json({ message: "No tenant found" });
  }

  const tenant = await Tenant.findById(user.tenantId);
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
