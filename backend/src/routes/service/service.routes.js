const express = require("express");
const router = express.Router();
const {
  createService,
  getMyServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../../controllers/service/service.controller");
const validateShopOwnershipMiddleware = require("../../middlewares/service/validateShopOwnership.middleware");

router.get("/check", (req, res) => {
  res.send("Service API working");
});

// Create Service
router.post(
  "/shops/:shopId/services",
  validateShopOwnershipMiddleware,
  createService,
);

// Get All Services of a Shop
router.get(
  "/shops/:shopId/services",
  validateShopOwnershipMiddleware,
  getMyServices,
);

// Get Single Service
router.get(
  "/shops/:shopId/services/:serviceId",
  validateShopOwnershipMiddleware,
  getServiceById,
);

// Update Service
router.patch(
  "/shops/:shopId/services/:serviceId",
  validateShopOwnershipMiddleware,
  updateService,
);

// Delete Service
router.delete(
  "/shops/:shopId/services/:serviceId",
  validateShopOwnershipMiddleware,
  deleteService,
);

module.exports = router;
