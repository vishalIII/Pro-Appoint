const AppError = require("../../utils/appError");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
exports.createOrder = async (amount) => {
    try {
        if (!amount) {
            throw new AppError("Amount required", 400);
        }

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        });
        return order;
    } catch (error) {
        throw new AppError(error?.error?.description || error.message || "Order creation failed", 500);
    }
}
exports.verifyPayment = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    try {
        const sign = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest("hex");
            return expectedSignature === razorpay_signature;
    } catch (error) {
        throw new AppError("Payment verification failed", 500);
    }
}