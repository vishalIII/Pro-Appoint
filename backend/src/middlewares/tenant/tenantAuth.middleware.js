module.exports = (req, res, next) => {
  if (req.user.role !== "ServiceProvider") {
    return res.status(403).json({
      message: "Only service providers can perform this action"
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      message: "Tenant account not linked"
    });
  }

  next();
};
