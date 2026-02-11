const User = require("../../models/user/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppError = require("../../utils/appError");

// =======================================================
// Register service
// =======================================================
exports.register = async ({ name, email, password, role }) => {
  try {
    if (!name || !email || !password) {
      throw new AppError("All fields are required", 400);
    }

    // 1️⃣ Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    // 2️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3️⃣ Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "Customer",
      tenantId: null,
      isVerified: role === "Customer",
    });

    return {
      userId: user._id,
    };

  } catch (error) {
    throw new AppError(
      error.message || "Registration failed",
      error.statusCode || 500
    );
  }
};

// =======================================================
// Login service
// =======================================================
exports.login = async ({ email, password }) => {
  try {
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    // 1️⃣ Find user
    const user = await User.findOne({ email })
      .select("+password")
      .populate("tenantId");

    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId?._id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      token,
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
    throw new AppError(
      error.message || "Login failed",
      error.statusCode || 500
    );
  }
};
