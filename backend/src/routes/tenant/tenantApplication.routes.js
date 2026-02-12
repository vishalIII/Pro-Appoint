const express = require("express");
const router = express.Router();
const {createTenant} = require("../../controllers/tenant/tenantApplication.controller");

router.post("/", createTenant);

module.exports = router;
