const express = require("express");
const router = express.Router();
const {getActiveIndustries, applyProvider, getApplicationStatus , getApplicationHistory} = require("../../controllers/tenant/tenantApplication.controller");

router.get("/", (req, res) => {
  res.send("TenantApplication API working");
});

router.get("/service-provider-application", getActiveIndustries);
router.post("/service-provider-application", applyProvider);
router.get("/service-provider-application-status", getApplicationStatus);
router.get("/service-provider-applications", getApplicationHistory);  //this is to get all application documents

module.exports = router;
