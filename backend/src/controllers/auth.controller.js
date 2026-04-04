const authService = require("../services/auth/auth.service");
const logRefresh = (message, meta = {}) => {
  try {
    console.log(`[auth:refresh] ${message}`, meta);
  } catch (_) {
    // ignore logging errors
  }
};

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

    // ✅ Set refresh token in cookie (honor env for dev/prod)
    res.cookie("refreshToken", result.refreshToken, buildRefreshCookieOptions());

    return res.status(200).json({
      message: "Login successful",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // optional fallback when cookies are blocked
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// Register Provider Subscription Order (for new provider upgrade)
// =======================================================
exports.registerProviderSubscription = async (req, res, next) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ message: "userId and plan required" });
    }

    const paymentService = require("../services/payments/payment.service");
    const order = await paymentService.createSubscriptionOrder(plan, userId);

    return res.status(201).json({
      message: "Subscription order created",
      order,
    });
  } catch (error) {
    next(error);
  }
};

const jwt = require("jsonwebtoken");
const User = require("../models/user/user.model");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");

const buildRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  const secureCookie = process.env.COOKIE_SECURE === "true" || isProd;
  const sameSite = isProd ? "None" : "Lax";

  return {
    httpOnly: true,
    secure: secureCookie, // must be true when SameSite=None in prod
    sameSite,
    path: "/",
  };
};

exports.refreshToken = async (req, res) => {
  try {
    const token =
      req.cookies.refreshToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null) ||
      req.body?.refreshToken;

    if (!token) {
      logRefresh("missing token");
      return res.sendStatus(401);
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.userId).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      logRefresh("token mismatch or user missing", {
        userFound: Boolean(user),
        refreshMatches: user ? user.refreshToken === token : false,
      });
      return res.sendStatus(403);
    }

    // rotate both tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    // refresh cookie
    res.cookie("refreshToken", newRefreshToken, buildRefreshCookieOptions());

    logRefresh("refresh success", { userId: user._id });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    logRefresh("refresh error", { message: err?.message });
    res.sendStatus(403);
  }
};


exports.logout = async (req, res) => {
  const token =
    req.cookies.refreshToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null) ||
    req.body?.refreshToken;

  if (token) {
    const user = await User.findOne({ refreshToken: token }).select("+refreshToken");
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie("refreshToken", buildRefreshCookieOptions());
  res.sendStatus(200);
};
