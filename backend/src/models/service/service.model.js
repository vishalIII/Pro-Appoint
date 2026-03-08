const mongoose = require("mongoose");
const {
  serviceWeeklyAvailabilitySchema,
} = require("../service/schemas/availability.schema");

const requiredResourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shop",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    
    discountPercentage: {
      type: Number,
      default: 0,
    },

    weeklyAvailability: {
      type: [serviceWeeklyAvailabilitySchema],
      required: true,
    },

    closedPeriods: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          default: "Shop is closed",
        },
      },
    ],

    category: String,
    // e.g. Hair, Skin, Consultation, Repair

    images: [String],
    price: Number,

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    requiredResources: [
  { 
    _id: false,
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "resource",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

serviceSchema.index({
  shopId: 1,
  isActive: 1,
});
module.exports = mongoose.model("service", serviceSchema);
