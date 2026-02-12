const express = require("express");
const router = express.Router();
const {getActiveIndustries, applyShop, getApplicationStatus , getApplicationHistory} = require("../../controllers/shop/shopApplication.controller");

router.get("/industries", getActiveIndustries);
router.post("/", applyShop);
router.get("/status", getApplicationStatus); 
router.get("/", getApplicationHistory);  //this is to get all application documents

module.exports = router;
