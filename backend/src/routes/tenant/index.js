const express = require("express");
const checkTenantSubscriptionMiddleware = require("../../middlewares/tenant/checkTenantSubscription.middleware");
const tenantAuth = require("../../middlewares/tenant/tenantAuth.middleware")
const router = express.Router();

router.get("/check", (req, res) => {
  res.send("tenant API working");
});

router.use("/create-tenant",require("./tenantApplication.routes"))

// Subscription details should stay reachable even if the current plan is expired.
router.use("/subscription", tenantAuth, require("./subscription.routes"));

/* --------------------------------------------------
   SHOP ROUTES (includes shop management & application)
   /api/tenant/shops
   /api/tenant/shops/application
   /api/tenant/shops/:shopId/services
-------------------------------------------------- */
router.use("/shops",checkTenantSubscriptionMiddleware,tenantAuth, require("../shop/index.js"));

// Tenant appointment management (tenant-only)
router.use('/appointments', checkTenantSubscriptionMiddleware, tenantAuth, require('./appointment.routes'));

// Dashboard analytics (tenant-only)
router.use(
  "/dashboard",
  checkTenantSubscriptionMiddleware,
  tenantAuth,
  require("./dashboard.routes"),
);

// Wallet routes (tenant-only)
router.use(
  "/wallet",
  checkTenantSubscriptionMiddleware,
  tenantAuth,
  require("./wallet.routes"),
);

module.exports = router;

