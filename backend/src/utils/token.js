const jwt = require("jsonwebtoken");

const resolveTenantId = (user) => {
  // Support both populated doc ({ _id }) and raw ObjectId
  if (!user || typeof user !== "object") return null;

  if (user.tenantId && typeof user.tenantId === "object") {
    // populated document or ObjectId
    return user.tenantId._id || user.tenantId;
  }

  return user.tenantId || null;
};

exports.generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tenantId: resolveTenantId(user),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
    // { expiresIn: "30s" } // for testing 30s
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};
