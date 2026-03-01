const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointment",
      required: true,
      unique: true, // one review per appointment
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shop",
      required: true,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "service",
      required: true,
      index: true,
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ shopId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });

module.exports = mongoose.model("review", reviewSchema);
