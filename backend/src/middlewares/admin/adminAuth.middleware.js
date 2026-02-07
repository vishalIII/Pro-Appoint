module.exports = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized: user not authenticated",
    });
  }

  if (req.user.role !== "Admin") {
    return res.status(403).json({
      message: "Admin access only",
    });
  }

  next();
}