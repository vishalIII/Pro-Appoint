let razorpay;

try {
  // Optional in local/dev flows that do not exercise payment endpoints.
  const Razorpay = require("razorpay");
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  razorpay = {
    orders: {
      create: async () => {
        throw new Error("Razorpay SDK is not installed");
      },
    },
  };
}

module.exports = razorpay;
