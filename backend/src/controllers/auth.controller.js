const User = require("../models/user/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered",existingUser });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "Customer",
      tenantId: null,
      isVerified: role === "Customer", // providers will verify later
    });

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Controller -------------------------------------------------------------

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(Object.keys(require("mongoose").models));
    // 1. Find user
    const user = await User.findOne({ email })
      .select("+password")    // '+' sign is for including password which is excluded by default '-' sign is for excluding
      .populate("tenantId");    

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
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

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId?._id || null,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};                                               