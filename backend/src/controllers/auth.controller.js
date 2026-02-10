const User = require("../models/user/user.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/auth/auth.service.js");
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user=await authService.createUser(name,email,password);
    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

// Login Controller -------------------------------------------------------------

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, token } = await authService.loginUser(email, password);

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
    next(error);
  }
};                                               