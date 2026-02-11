const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "09:00"
    end: { type: String, required: true },   // "18:00"
  },
  { _id: false }
);

const weeklyAvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    slots: {
      type: [timeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

module.exports = {
  timeSlotSchema,
  weeklyAvailabilitySchema,
};
