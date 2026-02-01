const express = require("express");
const router = express.Router();
const { getAllTenantApplications,approveTenant,rejectTenant } = require("../../controllers/admin/admin.controller");

router.get("/", (req, res) => {
  res.send("Admin API working");
});

router.get("/service-provider-applications", getAllTenantApplications);

router.put("/service-provider-applications/:tenantId/approve", approveTenant);

router.put("/service-provider-applications/:tenantId/reject", rejectTenant);

module.exports = router;
