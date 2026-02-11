const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    planStatus: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },

    trialStart: {
      type: Date,
      default: Date.now,
    },

    trialEnd: {
      type: Date,
    },

    planActivatedAt: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// When payment succeeds
// tenant.plan = "pro"; // or enterprise
// tenant.planStatus = "active";
// tenant.planActivatedAt = new Date();
// tenant.trialEnd = null;
// await tenant.save();


tenantSchema.index({ ownerId: 1 }, { unique: true });

module.exports = mongoose.model("tenant", tenantSchema);
