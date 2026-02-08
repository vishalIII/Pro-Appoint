module.exports = (req, res, next) => {
  if (req.user.role !== "ServiceProvider") {
    return res.status(403).json({
      message: "Only service providers can perform this action"
    });
  }
  next();
};
