const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    industry: {
      type: String,
      required: true
    },

    // User who owns this tenant
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    subscription: {
      plan: {
        type: String,
        enum: ["FREE", "BASIC", "PRO"],
        default: "FREE"
      },

      // Default expiry = 30 days from creation
      expiryDate: {
        type: Date,
        default: () => Date.now() + 30 * 24 * 60 * 60 * 1000
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
