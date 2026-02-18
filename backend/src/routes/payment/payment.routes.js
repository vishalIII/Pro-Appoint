const express = require("express");
const router = express.Router();
const paymentsController = require("../../controllers/razorpayPayments/payments.controller.js")
router.post("/create-order", paymentsController.createOrder)
router.post("/verify-payment", paymentsController.verifyPayment)
module.exports = router;