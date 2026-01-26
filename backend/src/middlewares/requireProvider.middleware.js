exports.requireProvider = (req, res, next) => {
  if (req.user.role !== "ServiceProvider") {
    return res.status(403).json({ message: "Provider access only" });
  }
  next();
};
