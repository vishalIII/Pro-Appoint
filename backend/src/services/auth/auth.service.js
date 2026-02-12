const User = require("../../models/user/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =======================================================
// Register service
// =======================================================
exports.register = async ({ name, email, password, role }) => {
  // 1. Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw {
      status: 400,
      message: "Email already registered",
    };
  }

  // 2. Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 3. Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "Customer",
    tenantId: null,
    isVerified: role === "Customer", // providers verified later
  });

  return {
    userId: user._id,
  };
};

// =======================================================
// Login service
// =======================================================
exports.login = async ({ email, password }) => {
  // 1. Find user
  const user = await User.findOne({ email })
    .select("+password")
    .populate("tenantId");

  if (!user || !user.isActive) {
    throw { status: 401, message: "Invalid credentials" };
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: "Invalid credentials" };
  }

  // 3. Generate JWT
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
};
