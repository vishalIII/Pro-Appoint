const express = require("express");
const router = express.Router();


router.get("/check", (req, res) => {
  res.send("tenant API working");
});

router.use("/create-tenant",require("./tenantApplication.routes"))
router.use("/shop-application", require("./shopApplication.routes"));

module.exports = router;
