const mongoose = require("mongoose");

const allocatedResourceSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "resource",
      required: true,
      index: true,
    },

    // Number of resource units allocated for this service
    unitsRequested: {
      type: Number,
      required: true,
      min: 1,
    },

    // Snapshot of seats each unit could serve at booking time
    seatsPerUnit: {
      type: Number,
      // required: true,
      min: 1,
    },

    // Cached total seats (unitsRequested × seatsPerUnit)
    seatsTotal: {
      type: Number,
      // required: true,
      min: 1,
    },
  },
  { _id: false },
);

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

    // Additional attendees for group / class style appointments (online only)
    attendees: [
      {
        _id: false,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          index: true,
        },
        paymentStatus: {
          type: String,
          enum: ["unpaid", "pending", "paid"],
          default: "unpaid",
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],

    // Flags a shared-slot booking (e.g. online class)
    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Capacity captured from service at booking time to prevent drift
    capacitySnapshot: {
      type: Number,
      min: 1,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shop",
      required: true,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "service",
      required: true,
      index: true,
    },

    allocatedResources: {
      type: [allocatedResourceSchema],
      default: [],
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
        "provider_cancelled",
        "customer_cancelled",
        "provider_no_show",
        "customer_no_show",
        "both_no_show",
        "auto_completed",
        "manual_completed",
        "system_cancelled",
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

    noShowMarkedAt: Date,

    /* ---------------- MODE ---------------- */

    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
      index: true,
    },

    /* ---------------- ONLINE MEETING ---------------- */

    meeting: {
      type: {
        roomId: {
          type: String,
          index: true,
        },
        status: {
          type: String,
          enum: ["waiting", "live", "ended"],
          default: "waiting",
        },
        startedAt: Date,
        endedAt: Date,
        participants: [
          {
            _id: false,
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            userName: String,
            role: String,
            joinEvents: [
              {
                _id: false,
                at: { type: Date, default: Date.now },
                action: { type: String, enum: ["join", "leave"] },
              },
            ],
          },
        ],
      },
      default: undefined, // ⭐ CRITICAL
    },

    /* ---------------- OFFLINE LOCATION ---------------- */

    location: {
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "shop",
        required: function () {
          return this.mode === "offline";
        },
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
  { timestamps: true },
);

//================================================ VALIDATION
appointmentSchema.pre("validate", function () {
  // Time sanity
  if (this.startTimeUTC >= this.endTimeUTC) {
    throw new Error("startTimeUTC must be before endTimeUTC");
  }

  // Auto duration
  this.durationMinutes = (this.endTimeUTC - this.startTimeUTC) / 60000;

  if (this.durationMinutes <= 0) {
    throw new Error("Invalid duration");
  }

  // Online validation
  if (this.mode === "online") {
    // Meeting is created when appointment is confirmed; no validation needed at creation time
  }

  // Offline validation
  // if (this.mode === "offline") {
  //   if (!this.location || !this.location.shopId) {
  //     throw new Error("Shop reference is required for offline appointments");
  //   }
  // }

  if (this.mode === "offline" && !this.location?.shopId) {
    throw new Error("Shop reference is required for offline appointments");
  }

  // Payment consistency rules
  if (
    this.paidAt &&
    !["paid", "refunded", "partially_refunded"].includes(this.paymentStatus)
  ) {
    throw new Error("paidAt exists but paymentStatus is not paid");
  }

  if (this.paymentStatus === "refunded" && !this.refund?.refundedAt) {
    throw new Error("Refunded status requires refundedAt date");
  }
});

allocatedResourceSchema.pre("validate", function (next) {
  if (this.unitsRequested && this.seatsPerUnit) {
    this.seatsTotal = this.unitsRequested * this.seatsPerUnit;
  }
  // next();
});

//======================================== VALID TRANSITIONS
const allowedTransitions = {
  pending: [
    "confirmed",
    "rejected",
    "cancelled",
    "customer_cancelled",
    "provider_cancelled",
    "system_cancelled",
  ],
  confirmed: [
    "completed",
    "manual_completed",
    "auto_completed",
    "cancelled",
    "cancelled_late",
    "customer_cancelled",
    "provider_cancelled",
    "system_cancelled",
    "no_show",
    "customer_no_show",
    "provider_no_show",
    "both_no_show",
  ],
  rejected: [],
  cancelled: [],
  cancelled_late: [],
  completed: [],
  manual_completed: [],
  auto_completed: [],
  no_show: [],
  customer_cancelled: [],
  provider_cancelled: [],
  system_cancelled: [],
  customer_no_show: [],
  provider_no_show: [],
  both_no_show: [],
};

appointmentSchema.pre("save", async function () {
  if (!this.isModified("status") || this.isNew) return;

  const previous = await this.constructor
    .findById(this._id)
    .session(this.$session())
    .select("status")
    .lean();

  if (!previous) return;

  const prevStatus = previous.status;
  const nextStatus = this.status;

  if (!allowedTransitions[prevStatus]?.includes(nextStatus)) {
    throw new Error(
      `Invalid status transition: ${prevStatus} -> ${nextStatus}`,
    );
  }
});

// For availability & calendar queries

appointmentSchema.index({ status: 1, expiresAt: 1 });
appointmentSchema.index({ status: 1, startTimeUTC: 1 });

appointmentSchema.index({
  tenantId: 1,
  status: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
});

appointmentSchema.index({
  attendeeId: 1,
  status: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
  expiresAt: 1,
});

appointmentSchema.index({
  shopId: 1,
  "allocatedResources.resourceId": 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
  status: 1,
});

appointmentSchema.index(
  {
    shopId: 1,
    "allocatedResources.resourceId": 1,
    startTimeUTC: 1,
    endTimeUTC: 1,
  },
  {
    partialFilterExpression: {
      status: { $in: ["confirmed", "pending"] },
    },
  },
);

appointmentSchema.index({
  "attendees.userId": 1,
  status: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
  expiresAt: 1,
});

appointmentSchema.index({
  serviceId: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
  mode: 1,
  isGroup: 1,
});

appointmentSchema.index(
  {
    shopId: 1,
    serviceId: 1,
    startTimeUTC: 1,
    endTimeUTC: 1,
    mode: 1,
    isGroup: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isGroup: true },
  },
);

// Auto expiry queries
appointmentSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("appointment", appointmentSchema);
