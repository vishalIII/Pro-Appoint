const authService = require("../services/auth/auth.service");

// =======================================================
// Register
// =======================================================
exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      message: "Registration successful",
      userId: result.userId,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Login
// =======================================================
exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};
