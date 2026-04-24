const express = require("express");
const router = express.Router();
const reviewController = require("../../src/controllers/review.controller");

router.post("/", reviewController.createShopReview);

module.exports = router;