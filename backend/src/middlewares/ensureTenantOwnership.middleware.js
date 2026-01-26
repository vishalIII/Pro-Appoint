exports.ensureTenantOwnership = (req, res, next) => {
  if (req.params.tenantId !== req.user.tenantId) {
    return res.status(403).json({ message: "Unauthorized tenant access" });
  }
  next();
};

//This middleware will be useful when tenantId comes from URL params.