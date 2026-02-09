const express = require("express");
const router = express.Router();
const { getAllShopApplications,approveShop,rejectShop } = require("../../controllers/admin/adminShopApplication.controller");

router.get("/", getAllShopApplications);

router.patch("/:shopId/approve", approveShop);

router.patch("/:shopId/reject", rejectShop);

module.exports = router;
