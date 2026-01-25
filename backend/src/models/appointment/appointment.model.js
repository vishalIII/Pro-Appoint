const mongoose = require("mongoose")

const appointmentSchema = new mongoose.Schema({

    tenantId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true,
        index:true,
    },

    attendeeId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true,
        index:true,
    },

    startTimeUTC: {
      type: Date,
      required: true,
      index: true,
    },

    endTimeUTC: {
      type: Date,
      required: true,
      index: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "pending",        // created, meeting link not ready
        "confirmed",      // booking successful
        "cancelled",      // cancelled in time
        "cancelled_late", // cancelled too late
        "completed",
        "no_show",
      ],
      default: "pending",
      index: true,
    },

    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      cancelledAt: Date,
      reason: String,
    },
                                                
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
},
  { timestamps: true }
);

module.exports = mongoose.model("appointment",appointmentSchema);