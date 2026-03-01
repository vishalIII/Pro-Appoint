const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",
      required: true,
      index: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shop",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    capacity: {
      type: Number,
      min: 1,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

resourceSchema.index({ shopId: 1, type: 1, isActive: 1 });

module.exports = mongoose.model("resource", resourceSchema);
