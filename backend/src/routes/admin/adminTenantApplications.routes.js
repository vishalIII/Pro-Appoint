const express = require("express");
const router = express.Router();
const { getAllTenantApplications,approveTenant,rejectTenant } = require("../../controllers/admin/adminTenantApplication.controller");

router.get("/", getAllTenantApplications);

module.exports = router;
