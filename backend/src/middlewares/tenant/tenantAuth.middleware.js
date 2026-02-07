module.exports = (req, res, next) => {

  if (req.user.role == "ServiceProvider" && req.user.tenantId) {
    return next()
  }

  return res.status(403).json({ message: "Access denied. Tenant authentication required." });
};
