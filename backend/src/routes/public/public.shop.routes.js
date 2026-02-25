const express = require("express");
const router = express.Router();
const { listShops, getShopByIdPublic } = require("../../controllers/public/shop.controller");
const publicServiceRoutes = require("./public.service.routes");

router.get("/", listShops);
router.get("/:shopId", getShopByIdPublic);

// Nested public service routes: /api/shops/:shopId/services
router.use("/:shopId/services", publicServiceRoutes);

module.exports = router;