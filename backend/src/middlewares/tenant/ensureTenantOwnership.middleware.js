const mongoose = require("mongoose");

exports.ensureTenantOwnership = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const paramTenantId = req.params.tenantId;
  const userTenantId = req.user.tenantId.toString();

  if (!mongoose.Types.ObjectId.isValid(paramTenantId)) {
    return res.status(400).json({
      message: "Invalid tenant ID",
    });
  }

  if (paramTenantId !== userTenantId) {
    return res.status(403).json({
      message: "Unauthorized tenant access",
    });
  }

  next();
};

//This middleware will be useful when tenantId comes from URL params.