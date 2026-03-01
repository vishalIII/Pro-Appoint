const mongoose = require("mongoose");
const {
  weeklyAvailabilitySchema,
} = require("../service/schemas/availability.schema");

const ShopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    industry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "industry",
      required: true,
      validate: {
        validator: async function (value) {
          const industry = await mongoose.model("industry").findOne({
            _id: value,
            isActive: true,
          });
          return !!industry;
        },
        message: "Industry is not active",
      },
    },

    weeklyAvailability: {
      type: [weeklyAvailabilitySchema],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    images: [String],

    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"],
    },

    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landMark: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "blocked"],
      default: "pending",
    },

    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    ratingBreakdown: {
      star1: { type: Number, default: 0, min: 0 },
      star2: { type: Number, default: 0, min: 0 },
      star3: { type: Number, default: 0, min: 0 },
      star4: { type: Number, default: 0, min: 0 },
      star5: { type: Number, default: 0, min: 0 },
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

    documents: {
      gst: { type: String },
      license: { type: String },
      other: [{ type: String }],
    },

    // rejection or blocked reason-------> auditability + clarity.
    statusMeta: {
      type: {
        reason: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        at: { type: Date, default: Date.now },
      },
      required: function () {
        return ["rejected", "blocked"].includes(this.status);
      },
    },
  },
  { timestamps: true },
);

ShopSchema.index(
  { ownerId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }, //For documents with status = "pending" → ownerId must be unique
  },
);

module.exports = mongoose.model("shop", ShopSchema);
