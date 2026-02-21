const express = require("express");
const router = express.Router();
const {
  getActiveIndustries,
  applyShop,
  getApplicationStatus,
  getApplicationHistory,
} = require("../../controllers/shop/shopApplication.controller");

/* --------------------------------------------------
   SHOP APPLICATION ROUTES
   /api/tenant/shops/application
-------------------------------------------------- */

// Get active industries
router.get("/industries", getActiveIndustries);

// Apply for shop
router.post("/", applyShop);

// Get shop application status
router.get("/status", getApplicationStatus);

// Get shop application history
router.get("/", getApplicationHistory);

module.exports = router;
