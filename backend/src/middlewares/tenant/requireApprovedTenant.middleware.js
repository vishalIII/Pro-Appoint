const Tenant = require("../../models/tenant/tenant.model");

module.exports = async (req, res, next) => {
  if (!req.user.tenantId) {
    return res.status(403).json({ message: "Create your store first" });
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant || tenant.status!=="approved") {
    return res
      .status(403)
      .json({ message: "Tenant not approved yet" });
  }

  req.tenant = tenant;
  next();
};
