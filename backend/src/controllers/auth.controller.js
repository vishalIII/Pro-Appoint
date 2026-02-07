const User = require("../models/user/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/auth/auth.service.js");
exports.register = async (req, res) => {
  try {
    const { name, email, password} = req.body;

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
      tenantId: null // providers will verify later
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

    const {user, token} = await authService.loginUser(email, password);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId?._id || null
      },
    });

    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};                                               