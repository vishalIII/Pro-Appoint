const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    /* ---------------- MULTI TENANT ---------------- */

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    attendeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    shopId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "shop",
      required: true,
      index: true,
    },

    serviceId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "service",
      required: true,
      index: true,
    },

    /* ---------------- TIME ---------------- */

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
      min: 1,
    },

    expiresAt: {
      type: Date,
      index: true,
    },

    /* ---------------- PRICING ---------------- */

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    /* ---------------- PAYMENT ---------------- */

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "unpaid",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "net_banking", "wallet"],
    },

    paymentReference: {
      type: String,
    },

    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", "phonepe"],
    },

    paidAt: Date,

    refund: {
      amount: {
        type: Number,
        min: 0,
      },
      refundedAt: Date,
      reason: String,
    },

    /* ---------------- STATUS ---------------- */

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "cancelled_late",
        "completed",
        "no_show",
      ],
      default: "pending",
      index: true,
    },

    /* ---------------- APPROVAL TRACKING ---------------- */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    approvedAt: Date,

    completedAt: Date,

    noShowMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    /* ---------------- MODE ---------------- */

    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
      index: true,
    },

    /* ---------------- ONLINE MEETING ---------------- */

    meeting: {
      platform: {
        type: String,
        enum: ["zoom", "google_meet", "teams", "in_person"],
      },
      link: String,
      meetingId: String,
    },

    /* ---------------- OFFLINE LOCATION ---------------- */

    location: {
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "shop",
        required: true,
      },
    },

    /* ---------------- CANCELLATION ---------------- */

    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
      cancelledAt: Date,
      reason: String,
    },

    /* ---------------- RESCHEDULE ---------------- */

    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointment",
    },

    /* ---------------- FLEXIBLE METADATA ---------------- */

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

//================================================ VALIDATION
appointmentSchema.pre("validate", function () {
  // Time sanity
  if (this.startTimeUTC >= this.endTimeUTC) {
    throw new Error("startTimeUTC must be before endTimeUTC");
  }

  // Auto duration
  this.durationMinutes =
    (this.endTimeUTC - this.startTimeUTC) / 60000;

  if (this.durationMinutes <= 0) {
    throw new Error("Invalid duration");
  }

  // Online validation
  if (this.mode === "online") {
    if (!this.meeting || !this.meeting.link) {
      throw new Error("Meeting link is required for online appointments");
    }
  }

  // Offline validation
  if (this.mode === "offline") {
    if (!this.location || !this.location.shopId) {
      throw new Error("Shop reference is required for offline appointments");
    }
  }

  // Payment consistency rules
  if (this.paidAt && this.paymentStatus !== "paid") {
    throw new Error("paidAt exists but paymentStatus is not paid");
  }

  if (this.paymentStatus === "refunded" && !this.refund?.refundedAt) {
    throw new Error("Refunded status requires refundedAt date");
  }
});

//======================================== VALID TRANSITIONS
const allowedTransitions = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "cancelled_late", "no_show"],
  rejected: [],
  cancelled: [],
  cancelled_late: [],
  completed: [],
  no_show: [],
};

appointmentSchema.pre("save", function () {
  // use synchronous style and throw on invalid transitions
  if (!this.isModified("status")) return;

  const prevStatus = this._previousStatus || this.status;
  const nextStatus = this.status;

  if (
    this.isNew === false &&
    !allowedTransitions[prevStatus]?.includes(nextStatus)
  ) {
    throw new Error(`Invalid status transition: ${prevStatus} → ${nextStatus}`);
  }
});


// For availability & calendar queries
appointmentSchema.index({
  tenantId: 1,
  status: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
});

// Auto expiry queries
appointmentSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("appointment", appointmentSchema);