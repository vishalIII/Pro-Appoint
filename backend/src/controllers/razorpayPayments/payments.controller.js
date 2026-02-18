const razorpay = require("../../config/razorpay/razorpay.js");
const crypto = require("crypto");

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount required" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    });

    return res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Order creation failed" });
  }
};

exports.verifyPayment = (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    return res.json({ success: true });
  }

  return res.status(400).json({ success: false });
};
