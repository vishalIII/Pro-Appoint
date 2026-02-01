const express = require("express");
const router = express.Router();
const { applyProvider, getApplicationStatus } = require("../../controllers/tenant/tenantApplication.controller");

router.get("/", (req, res) => {
  res.send("TenantApplication API working");
});

router.post("/service-provider-application", applyProvider);
router.get("/service-provider-application-status", getApplicationStatus);

module.exports = router;
