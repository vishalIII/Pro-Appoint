const mongoose = require("mongoose");

const dayEnum = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "18:00"
  },
  { _id: false }
);

const shopWeeklyAvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: dayEnum,
      required: true,
    },
    isOpen: {
      type: Boolean,
      required: true,
      default: false,
    },
    slots: {
      type: [timeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

const serviceWeeklyAvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: dayEnum,
      required: true,
    },
    isOpen: {
      type: Boolean,
      required: true,
      default: false,
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
  shopWeeklyAvailabilitySchema,
  serviceWeeklyAvailabilitySchema,
};
