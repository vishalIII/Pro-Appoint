const express = require("express");
const router = express.Router();
const { getAllTenantApplications,approveTenant,rejectTenant } = require("../../controllers/admin/adminTenantApplication.controller");

router.get("/", getAllTenantApplications);

router.patch("/service-provider-applications/:tenantId/approve", approveTenant);

router.patch("/service-provider-applications/:tenantId/reject", rejectTenant);

module.exports = router;
