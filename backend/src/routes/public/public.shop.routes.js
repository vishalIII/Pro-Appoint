const express = require("express");
const router = express.Router({ mergeParams: true }); 
const {
  listShops,
  getShopByIdPublic,
  getShopReviews,
  getShopReviewSummary,
} = require("../../controllers/public/shop.controller");
const publicServiceRoutes = require("./public.service.routes");

router.get("/", listShops);
router.get("/:shopId", getShopByIdPublic);
router.get("/:shopId/reviews", getShopReviews);
router.get("/:shopId/review-summary", getShopReviewSummary);

// Nested public service routes: /api/shops/:shopId/services
router.use("/:shopId/services", publicServiceRoutes);

module.exports = router;
