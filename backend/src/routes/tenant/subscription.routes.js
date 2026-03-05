const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/tenant/subscription.controller");

router.get("/", subscriptionController.getSubscription);

module.exports = router;
