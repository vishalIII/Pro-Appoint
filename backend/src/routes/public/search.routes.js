const express = require("express");
const router = express.Router();
const { searchServices } = require("../../controllers/public/search.controller");

router.get("/", searchServices);

module.exports = router;
