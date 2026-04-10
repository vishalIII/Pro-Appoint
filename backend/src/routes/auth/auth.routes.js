const express = require("express");
const router = express.Router();
const { register, login, registerProviderSubscription, verifyOtp, resendOtp } = require("../../controllers/auth.controller");
const authController = require("../../controllers/auth.controller");

router.get("/", (req, res) => {
  res.send("Auth Home API working");
});

router.post("/register", register);
router.post("/login", login);
router.post("/register-provider-subscription", registerProviderSubscription);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
