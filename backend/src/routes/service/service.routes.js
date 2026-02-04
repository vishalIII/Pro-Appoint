const express = require("express");
const router = express.Router();
const {createService,getMyServices,updateService} = require("../../controllers/service/service.controller")

router.get("/check", (req, res) => {
  res.send("service API working");
});

router.post("/", createService);

router.get("/", getMyServices);

router.patch("/:id", updateService);

module.exports = router;
