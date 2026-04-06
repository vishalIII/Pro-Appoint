const express = require("express");
const router = express.Router();


router.get("/check", (req, res) => {
  res.send("Admin API working");
});

router.use("/shop-application", require("./adminShopApplications.routes"));
router.use("/industry", require("./industry.routes"));
router.use("/tenant-application", require("./adminTenantApplications.routes"));

module.exports = router;
