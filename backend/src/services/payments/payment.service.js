const crypto = require("crypto");
const AppError = require("../../utils/appError");
const razorpay = require("../../config/razorpay");
const Payment = require("../../models/payment/paymentData.model");
const appointmentService = require("../appointment/appointment.service");

exports.createOrder = async (amount) => {
  try {
    if (!amount || Number(amount) <= 0) {
      throw new AppError("Amount required", 400);
    }

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return order;
  } catch (error) {
    throw new AppError(
      error?.error?.description || error.message || "Order creation failed",
      500,
    );
  }
};

exports.verifyPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  amount,
  userData,
  appointmentId,
}) => {
  try {
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      if (appointmentId) {
        await appointmentService.markAppointmentPaymentFailed({
          appointmentId,
          paymentReference: razorpay_payment_id,
          paymentGateway: "razorpay",
        });
      }

      throw new AppError("Payment verification failed", 400);
    }

    try {
      await Payment.create({
        userId: userData?.userId || null,
        tenantId: userData?.tenantId || null,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount,
      });
    } catch (error) {
      // Idempotency for repeated gateway callbacks.
      if (error?.code !== 11000) {
        throw error;
      }
    }

    let appointmentResult = null;
    if (appointmentId) {
      appointmentResult = await appointmentService.confirmAppointmentPayment({
        appointmentId,
        paymentReference: razorpay_payment_id,
        paymentGateway: "razorpay",
      });
    }

    return {
      verified: true,
      appointment: appointmentResult?.appointment || null,
      paymentConflict: appointmentResult?.paymentConflict || false,
      conflictReason: appointmentResult?.conflictReason || null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Payment verification failed", 500);
  }
};

exports.confirmAppointmentPaymentSuccess = async ({
  appointmentId,
  paymentReference,
  paymentGateway,
  paymentMethod,
}) =>
  appointmentService.confirmAppointmentPayment({
    appointmentId,
    paymentReference,
    paymentGateway,
    paymentMethod,
  });

exports.markAppointmentPaymentFailed = async ({
  appointmentId,
  paymentReference,
  paymentGateway,
}) =>
  appointmentService.markAppointmentPaymentFailed({
    appointmentId,
    paymentReference,
    paymentGateway,
  });
