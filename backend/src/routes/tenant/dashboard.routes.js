const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/tenant/dashboard.controller");

router.get("/summary", dashboardController.getSummary);
router.get("/revenue", dashboardController.getRevenue);
router.get("/service-performance", dashboardController.getServicePerformance);
router.get("/resource-utilization", dashboardController.getResourceUtilization);

module.exports = router;
