const express = require("express");
const router = express.Router({ mergeParams: true });
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
router.post("/", validateShopOwnershipMiddleware, createService);

// Get All Services of a Shop
router.get("/", validateShopOwnershipMiddleware, getMyServices);

// Get Single Service
router.get("/:serviceId", validateShopOwnershipMiddleware, getServiceById);

// Update Service
router.patch("/:serviceId", validateShopOwnershipMiddleware, updateService);

// Delete Service
router.delete("/:serviceId", validateShopOwnershipMiddleware, deleteService);


module.exports = router;
