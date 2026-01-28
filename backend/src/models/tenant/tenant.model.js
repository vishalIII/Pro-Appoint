const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema(
  {
    ServiceName: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "industry",
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },
    
    images: [String],

    contactEmail: String,
    contactPhone: String,

    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landMark: String,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    documents: {
      gst: { type: String },
      license: { type: String },
      other: [{ type: String }],
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("tenant", TenantSchema);
