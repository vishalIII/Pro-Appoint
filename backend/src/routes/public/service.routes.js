const express = require("express");
const router = express.Router({ mergeParams: true });
const { listServices, getServiceByIdPublic } = require("../../controllers/public/service.controller");

router.get("/", listServices);
router.get("/:serviceId", getServiceByIdPublic);

module.exports = router;
