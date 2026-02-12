const express = require("express");
const router = express.Router();
const {createTenant} = require("../../controllers/tenant/tenantApplication.controller");

<<<<<<< HEAD
router.get("/", (req, res) => {
  res.send("TenantApplication API working");
});

router.get("/service-provider-application", getActiveIndustries);
router.post("/service-provider-application", applyProvider);

=======
router.post("/", createTenant);
>>>>>>> b6ca8348e9276c1a321316beb50610bf63320967

module.exports = router;
