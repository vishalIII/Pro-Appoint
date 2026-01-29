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
        "completed",      // meeting took place 
        "no_show",        // attendee did not show up
      ],
      default: "pending",
      index: true,
    },

    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
      index: true,
    },

    meeting: {
      platform: {
        type: String, // zoom | google_meet | teams | custom
      },
      link: {
        type: String,
      },
      meetingId: String,
    },

    location: {
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenant",
      },
      address: String,
      room: String,
      lat: Number,
      lng: Number,
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


//--------------------- VALIDATIONS ---------------
appointmentSchema.pre("validate", function (next) {
  // Time sanity check
  if (this.startTimeUTC >= this.endTimeUTC) {
    return next(new Error("startTimeUTC must be before endTimeUTC"));
  }

  // Online → meeting required
  if (this.mode === "online") {
    if (!this.meeting || !this.meeting.link) {
      return next(
        new Error("Meeting link is required for online appointments")
      );
    }
  }

  // Offline → location from shop required
  if (this.mode === "offline") {
    if (!this.location || !this.location.shopId || !this.location.address) {
      return next(
        new Error("Shop location is required for offline appointments")
      );
    }
  }

  next();
});

/* ---------------- INDEXES ---------------- */
// Fast calendar & availability queries
appointmentSchema.index({
  tenantId: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
});


module.exports = mongoose.model("appointment",appointmentSchema);