const express = require("express");
const router = express.Router();
const { getAllTenantApplications } = require("../../controllers/admin/admin.controller");

router.get("/", (req, res) => {
  res.send("Admin API working");
});

router.get("/service-provider-applications", getAllTenantApplications);

module.exports = router;
