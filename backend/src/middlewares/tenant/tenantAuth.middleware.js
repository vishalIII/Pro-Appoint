const AppError = require("../../utils/appError");

module.exports = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (req.user.role !== "ServiceProvider") {
      return next(
        new AppError("Only service providers can perform this action", 403)
      );
    }

    if (!req.user.tenantId) {
      return next(new AppError("Tenant not assigned to user", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
