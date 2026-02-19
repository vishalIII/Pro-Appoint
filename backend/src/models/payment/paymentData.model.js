const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // WHO PAID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    // OPTIONAL: only for tenant-related payments
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",
      default: null
    },

    // RAZORPAY IDENTIFIERS (PROOF OF SUCCESS)
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    paymentId: {
      type: String,
      required: true,
      unique: true
    },
    signature: {
      type: String,
      required: true
    },

    // MONEY
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentData", paymentSchema);
