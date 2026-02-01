const express = require("express");
const router = express.Router();
const { getAllTenantApplications } = require("../../controllers/admin/admin.controller");

router.get("/", (req, res) => {
  res.send("TenantApplication API working");
});

router.post("/service-provider-application", applyProvider);
router.get("/service-provider-application-status", getApplicationStatus);

module.exports = router;
