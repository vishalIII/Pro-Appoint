module.exports = (req, res, next) => {
<<<<<<< HEAD

  if (req.user.role == "ServiceProvider" && req.user.tenantId) {
    return next()
  }

  return res.status(403).json({ message: "Access denied. Tenant authentication required." });
=======
  if (req.user.role !== "ServiceProvider") {
    return res.status(403).json({
      message: "Only service providers can perform this action"
    });
  }
  next();
>>>>>>> b6ca8348e9276c1a321316beb50610bf63320967
};
