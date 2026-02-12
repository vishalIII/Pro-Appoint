const express = require("express");
const router = express.Router();
const { getAllShopApplication,getPendingShopApplication,approveShop,rejectShop } = require("../../controllers/admin/adminShopApplication.controller");

router.get("/", getAllShopApplication);

router.get("/pending", getPendingShopApplication);

router.patch("/:shopId/approve", approveShop);

router.patch("/:shopId/reject", rejectShop);

module.exports = router;
