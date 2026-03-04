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

    requiredResources: {
      type: [requiredResourceSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "requiredResources must contain at least one entry",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("service", serviceSchema);
