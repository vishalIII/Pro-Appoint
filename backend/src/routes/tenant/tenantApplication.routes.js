const express = require("express");
const router = express.Router();
const {getActiveIndustries, applyProvider, getApplicationStatus } = require("../../controllers/tenant/tenantApplication.controller");

router.get("/", (req, res) => {
  res.send("TenantApplication API working");
});

router.get("/service-provider-application", getActiveIndustries);
router.post("/service-provider-application", applyProvider);


module.exports = router;
