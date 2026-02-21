const express = require("express");
const checkTenantSubscriptionMiddleware = require("../../middlewares/tenant/checkTenantSubscription.middleware");
const tenantAuth = require("../../middlewares/tenant/tenantAuth.middleware")
const router = express.Router();

router.get("/check", (req, res) => {
  res.send("tenant API working");
});

router.use("/create-tenant",require("./tenantApplication.routes"))

/* --------------------------------------------------
   SHOP ROUTES (includes shop management & application)
   /api/tenant/shops
   /api/tenant/shops/application
   /api/tenant/shops/:shopId/services
-------------------------------------------------- */
router.use("/shops",checkTenantSubscriptionMiddleware,tenantAuth, require("../shop/index.js"));

module.exports = router;


