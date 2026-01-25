const mongoose = require("mongoose")
const {
  weeklyAvailabilitySchema,
} = require("../service/schemas/availability.schema");
const {closureSchema} = require("../service/schemas/closure.Schema")

const serviceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    weeklyAvailability: {
      type: [weeklyAvailabilitySchema],
      required: true,
    },

    closures: {
      type: [closureSchema],
      default: [],
    },

    category: String,
    // e.g. Hair, Skin, Consultation, Repair    

    images: [String],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("service", serviceSchema);