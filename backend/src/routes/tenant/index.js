const express = require("express");
const checkTenantSubscriptionMiddleware = require("../../middlewares/tenant/checkTenantSubscription.middleware");
const router = express.Router();

router.get("/check", (req, res) => {
  res.send("tenant API working");
});

router.use("/create-tenant",require("./tenantApplication.routes"))
router.use("/shop-application",checkTenantSubscriptionMiddleware, require("./shopApplication.routes"));

module.exports = router;
