const express = require("express");
const router = express.Router();
const {
  getMyShops,
  getShopById,
  updateShop,
  deleteShop,
} = require("../../controllers/shop/shop.controller");
const validateShopOwnershipMiddleware = require("../../middlewares/service/validateShopOwnership.middleware");
const serviceRoutes = require("../service/service.routes");
const resourceRoutes = require("../resource/resource.routes");
const shopApplicationRoutes = require("./shopApplication.routes");
const appointmentRoutes = require("../tenant/appointment.routes");

router.get("/check", (req, res) => {
  res.send("Shop API working");
});

/* --------------------------------------------------
   SHOP APPLICATION ROUTES
   /api/tenant/shops/application
-------------------------------------------------- */
router.use("/shop-application", shopApplicationRoutes);

/* --------------------------------------------------
   SHOP MANAGEMENT ROUTES
   /api/tenant/shops
-------------------------------------------------- */
router.get("/", getMyShops);
router.get("/:shopId", validateShopOwnershipMiddleware, getShopById);
router.patch("/:shopId", validateShopOwnershipMiddleware, updateShop);
router.delete("/:shopId", validateShopOwnershipMiddleware, deleteShop);

/* --------------------------------------------------
   NESTED SERVICE ROUTES
   /api/tenant/shops/:shopId/services
-------------------------------------------------- */
router.use("/:shopId/services", serviceRoutes);

/* --------------------------------------------------
   NESTED RESOURCE ROUTES
   /api/tenant/shops/:shopId/resources
-------------------------------------------------- */
router.use("/:shopId/resources", resourceRoutes);

/* --------------------------------------------------
   NESTED APPOINTMENT ROUTES
   /api/tenant/shops/:shopId/appointments
-------------------------------------------------- */
router.use("/:shopId/appointments", appointmentRoutes);

module.exports = router;
