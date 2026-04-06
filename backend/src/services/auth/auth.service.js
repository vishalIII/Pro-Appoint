const User = require("../../models/user/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppError = require("../../utils/appError");

// =======================================================
// Register service
// =======================================================
exports.register = async ({ name, email, password, role, intent }) => {
  try{
  const normalizedEmail = (email || "").trim().toLowerCase();

  // 1. Check existing user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
   throw new AppError("Email already in use", 409);
  }

  // 2. Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 3. Always register as Customer, store provider intent if provided
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: "Customer",
    intent: intent || null,
    tenantId: null,
    isVerified: true,
  });

  return {
    userId: user._id,
  };
}catch(error){
throw new AppError(error.message || "Failed to register user", error.statusCode || 500);
}
};


// =======================================================
// Login service
// =======================================================
const { generateAccessToken, generateRefreshToken } = require("../../utils/token");

exports.login = async ({ email, password }) => {
  try {
    // Normalize email to match how it is stored in Mongo (lowercased)
    const normalizedEmail = (email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail })
      .select("+password")
      .populate("tenantId");

    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    // ✅ Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ✅ Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId?._id || null,
        isVerified: user.isVerified,
      },
    };
  } catch (error) {
    throw new AppError(error.message || "Failed to login", error.statusCode || 500);
  }
};
