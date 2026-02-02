const express = require("express");
const router = express.Router();


router.get("/", (req, res) => {
  res.send("Admin API working");
});

router.use("/service-provider-applications", require("./adminTenantApplications.routes"));
router.use("/industry", require("./industry.routes"));

// router.use("/tenants", require("./tenants.routes"));
// router.use("/providers", require("./providers.routes"));
// router.use("/applications", require("./applications.routes"));

module.exports = router;
