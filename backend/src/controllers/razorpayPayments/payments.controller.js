const razorpay = require("../../config/razorpay/razorpay.js");
const crypto = require("crypto");
const paymentService = require("../../services/payments/payment.service");
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
      razorpay_signature
    } = req.body;

    const value = await paymentService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (value) {
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false });
  } catch (err) {
    next(err);
  }
};
