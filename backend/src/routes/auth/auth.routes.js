const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { register, login, registerProviderSubscription, verifyOtp, resendOtp } = authController;

router.get("/", (req, res) => {
  res.send("Auth Home API working");
});

router.post("/register", register);
router.post("/login", login);
router.post(
  "/register-provider-subscription",
  authMiddleware,
  registerProviderSubscription,
);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
