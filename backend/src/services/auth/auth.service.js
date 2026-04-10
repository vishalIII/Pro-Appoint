const User = require("../../models/user/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpEmail } = require("../../config/nodemailer");
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
    isVerified: false,
  });

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  // Send OTP email
  await sendOtpEmail(normalizedEmail, otp);
  console.log(`🔑 Generated OTP ${otp} for ${normalizedEmail}, expires ${otpExpiry.toISOString()}`);

  return {
    userId: user._id,
    message: "Registration successful. OTP sent to your email.",
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

    if (!user || !user.isActive || !user.isVerified) {
      throw new AppError("Please verify your email first", 401);
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

// Verify OTP
exports.verifyOtp = async ({ email, otp }) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.isVerified) {
      throw new AppError("Invalid OTP or already verified", 400);
    }

    if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    // Verify success
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    console.log(`✅ OTP verified successfully for ${normalizedEmail}`);

    return {
      message: "Email verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    throw new AppError(error.message || "Failed to verify OTP", error.statusCode || 500);
  }
};

// Resend OTP
exports.resendOtp = async ({ email }) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.isVerified) {
      throw new AppError("User not found or already verified", 400);
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendOtpEmail(normalizedEmail, otp);
    console.log(`🔄 Resent OTP ${otp} for ${normalizedEmail}, expires ${otpExpiry.toISOString()}`);

    return {
      message: "New OTP sent to your email",
    };
  } catch (error) {
    throw new AppError(error.message || "Failed to resend OTP", error.statusCode || 500);
  }
};
