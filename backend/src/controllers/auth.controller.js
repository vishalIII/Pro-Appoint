const authService = require("../services/auth/auth.service");

// =======================================================
// Register
// =======================================================
exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      message: "Registration successful",
      userId: result.userId,
    });
  } catch (error) {
    console.error("register error:", error);

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

// =======================================================
// Login
// =======================================================
exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("login error:", error);

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
