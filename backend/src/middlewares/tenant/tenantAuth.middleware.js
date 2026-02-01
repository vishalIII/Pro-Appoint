module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized: user not authenticated",
    });
  }

  if (req.user.role !== "ServiceProvider") {
    return res.status(403).json({
      message: "Provider access only",
    });
  }

  next();
};
