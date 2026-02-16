const express = require("express");
const router = express.Router();
const {
  createService,
  getMyServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../../controllers/service/service.controller");

router.get("/check", (req, res) => {
  res.send("Service API working");
});

/* --------------------------------------------------
   SERVICE ROUTES (SHOP SCOPED)
-------------------------------------------------- */

// Create Service
router.post("/shops/:shopId/services", createService);

// Get All Services of a Shop
router.get("/shops/:shopId/services", getMyServices);

// Get Single Service
router.get(
  "/shops/:shopId/services/:serviceId",
  getServiceById
);

// Update Service
router.patch(
  "/shops/:shopId/services/:serviceId",
  updateService
);

// Delete Service 
router.delete(
  "/shops/:shopId/services/:serviceId",
  deleteService
);

module.exports = router;
