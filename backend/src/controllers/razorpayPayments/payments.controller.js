const AppError = require("../../utils/appError");
const paymentService = require("../../services/payments/payment.service");

const assertWebhookSecret = (req) => {
  const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!configuredSecret) return;

  if (req.headers["x-webhook-secret"] !== configuredSecret) {
    throw new AppError("Unauthorized webhook request", 401);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const order = await paymentService.createOrder(amount);
    return res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      appointmentId,
    } = req.body;

    const result = await paymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      userData: req.user,
      appointmentId,
    });

    if (result.paymentConflict) {
      return res.status(409).json({
        success: false,
        message:
          result.conflictReason ||
          "Payment captured but appointment could not be confirmed",
        appointment: result.appointment,
      });
    }

    return res.json({
      success: true,
      appointment: result.appointment,
    });
  } catch (err) {
    next(err);
  }
};

exports.appointmentPaymentSuccessWebhook = async (req, res, next) => {
  try {
    assertWebhookSecret(req);

    const result = await paymentService.confirmAppointmentPaymentSuccess({
      appointmentId: req.params.appointmentId,
      paymentReference: req.body.paymentReference,
      paymentGateway: req.body.paymentGateway || "razorpay",
      paymentMethod: req.body.paymentMethod,
    });

    if (result.paymentConflict) {
      return res.status(409).json({
        success: false,
        message:
          result.conflictReason ||
          "Appointment cancelled due to resource conflict",
        appointment: result.appointment,
      });
    }

    return res.status(200).json({
      success: true,
      appointment: result.appointment,
    });
  } catch (error) {
    next(error);
  }
};

exports.appointmentPaymentFailedWebhook = async (req, res, next) => {
  try {
    assertWebhookSecret(req);

    const appointment = await paymentService.markAppointmentPaymentFailed({
      appointmentId: req.params.appointmentId,
      paymentReference: req.body.paymentReference,
      paymentGateway: req.body.paymentGateway || "razorpay",
    });

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

// Verify Subscription Payment (for provider registration upgrade)
exports.verifySubscriptionPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    const result = await paymentService.verifySubscriptionPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

