const express = require("express");
const router = express.Router();
const paymentsController = require("../../controllers/razorpayPayments/payments.controller.js")
router.post("/create-order", paymentsController.createOrder)
router.post("/verify-payment", paymentsController.verifyPayment)
router.post("/verify-subscription", paymentsController.verifySubscriptionPayment)
router.post(
  "/appointments/:appointmentId/payment-success",
  paymentsController.appointmentPaymentSuccessWebhook,
)
router.post(
  "/appointments/:appointmentId/payment-failed",
  paymentsController.appointmentPaymentFailedWebhook,
)
module.exports = router;

