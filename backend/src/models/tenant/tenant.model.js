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
      enum: ["basic", "pro", "enterprise"],
      default: "basic",
    },

    planStatus: {
      type: String,
      enum: ["active", "expired"],
      default: "expired",
    },

    subscriptionStart: {
      type: Date,
      default: Date.now,
    },

    subscriptionEnd: {
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
