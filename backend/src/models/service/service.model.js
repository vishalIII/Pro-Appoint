const mongoose = require("mongoose");
const {
  weeklyAvailabilitySchema,
} = require("../service/schemas/availability.schema");

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
      type: [weeklyAvailabilitySchema],
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("service", serviceSchema);
