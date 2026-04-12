const crypto = require("crypto");
const AppError = require("../../utils/appError");
const razorpay = require("../../config/razorpay");
const Payment = require("../../models/payment/paymentData.model");
const appointmentService = require("../appointment/appointment.service");
const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const mongoose = require("mongoose");
const { PLAN_LIMITS } = require("../../config/planLimits");
const { generateAccessToken } = require("../../utils/token");
// AppError already required above


exports.createSubscriptionOrder = async (plan, userId) => {
  try {
    const validPlans = Object.keys(PLAN_LIMITS);
    if (!validPlans.includes(plan)) {
      throw new AppError(`Invalid plan: ${plan}. Must be ${validPlans.join(', ')}`, 400);
    }

    // Test prices per user: basic=1, pro=2, enterprise=3 INR
    const planPrices = { basic: 1, pro: 2, enterprise: 3 };
    const amount = planPrices[plan];
    if (!amount) throw new AppError("Plan price not configured", 500);

    // Verify user exists
    const user = await User.findById(userId);
    if (!user || user.role !== 'Customer') {
      throw new AppError("User not eligible for provider subscription", 400);
    }

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100, // paise
      currency: "INR",
      receipt: `sub_${Date.now() % 10000000}`, // short unique <40 chars
      notes: {
        userId,
        plan,
        type: 'provider_subscription'
      }
    });


    return order;
  } catch (error) {
    throw new AppError(
      error?.error?.description || error.message || "Subscription order creation failed",
      500,
    );
  }
};

const getFakePaymentSecret = () =>
  process.env.FAKEPAY_KEY_SECRET || "fakepay_test_secret";

const createFakeOrder = async (amount) => {
  if (!amount || Number(amount) <= 0) {
    throw new AppError("Amount required", 400);
  }

  return {
    id: `fakepay_order_${Date.now()}`,
    entity: "order",
    amount: Number(amount) * 100,
    currency: "INR",
    receipt: `fakepay_receipt_${Date.now()}`,
    status: "created",
  };
};

const verifyFakePayment = async ({
  orderId,
  paymentId,
  signature,
  amount,
  userData,
  appointmentId,
}) => {
  const sign = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", getFakePaymentSecret())
    .update(sign)
    .digest("hex");

  if (expectedSignature !== signature) {
    if (appointmentId) {
      await appointmentService.markAppointmentPaymentFailed({
        appointmentId,
        paymentReference: paymentId,
        paymentGateway: "fakepay",
      });
    }

    throw new AppError("Payment verification failed", 400);
  }

  try {
    await Payment.create({
      userId: userData?.userId || null,
      tenantId: userData?.tenantId || null,
      orderId,
      paymentId,
      signature,
      amount,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  let appointmentResult = null;
  if (appointmentId) {
    appointmentResult = await appointmentService.confirmAppointmentPayment({
      appointmentId,
      paymentReference: paymentId,
      paymentGateway: "fakepay",
    });
  }

  return {
    verified: true,
    appointment: appointmentResult?.appointment || null,
    paymentConflict: appointmentResult?.paymentConflict || false,
    conflictReason: appointmentResult?.conflictReason || null,
  };
};

exports.createOrder = async (amount, paymentGateway = "razorpay") => {
  try {
    if (paymentGateway === "fakepay") {
      return await createFakeOrder(amount);
    }

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
  paymentGateway = "razorpay",
}) => {
  try {
    if (paymentGateway === "fakepay") {
      return await verifyFakePayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount,
        userData,
        appointmentId,
      });
    }

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

exports.verifySubscriptionPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  amount
}) => {
  try {
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new AppError("Payment verification failed", 400);
    }

    // Fetch order to get notes (userId, plan)
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order.notes;
    if (!notes || notes.type !== 'provider_subscription') {
      throw new AppError("Invalid subscription payment", 400);
    }

    const { userId, plan } = notes;

    // Transactional update
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Check/create payment record idempotent
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          userId,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount,
          type: 'subscription'
        },
        { upsert: true, session }
      );

      // Upgrade user to ServiceProvider + create tenant
      const user = await User.findById(userId).session(session);
      if (!user || user.role !== 'Customer') {
        throw new AppError("User not eligible for upgrade", 400);
      }

      // Create tenant
      const tenant = await Tenant.create([{
        ownerId: userId,
        plan,
        planStatus: 'active',
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }], { session });

      // Update user
      user.role = 'ServiceProvider';
      user.tenantId = tenant[0]._id;
      await user.save({ session });

      await session.commitTransaction();
      session.endSession();

      const accessToken = generateAccessToken(user);
      const refreshedUser = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isVerified: user.isVerified,
      };

      return {
        verified: true,
        upgraded: true,
        plan,
        tenantId: tenant[0]._id,
        accessToken,
        user: refreshedUser,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Subscription verification failed", 500);
  }
};
