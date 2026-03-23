const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["topup", "deduct", "refund"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String, // appointmentId or topupId
    },
    balanceAfter: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
