const express = require("express");
const router = express.Router();


router.get("/check", (req, res) => {
  res.send("Admin API working");
});

router.use("/shop-application", require("./adminShopApplications.routes"));
router.use("/industry", require("./industry.routes"));

module.exports = router;
