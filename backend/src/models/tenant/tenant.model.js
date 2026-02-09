const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    
    // User who owns this tenant
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    //need to think more about subscription plan
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

tenantSchema.index({ ownerId: 1 }, { unique: true });

module.exports = mongoose.model("tenant", tenantSchema);