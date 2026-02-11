const mongoose = require("mongoose");

const closureSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    isFullDay: {
      type: Boolean,
      default: true,
    },
    slots: {
      type: [timeSlotSchema], // if closed for specific time
      default: [],
    },
  },
  { _id: false }
);

module.exports={closureSchema}