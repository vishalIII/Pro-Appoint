const mongoose = require("mongoose");

const serviceTypeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: Number,
    durationInMinutes: Number,
    isActive: {
      type: Boolean,
      default: true,
    },

    metadata: mongoose.Schema.Types.Mixed, // tenant-specific data
  },
  { timestamps: true }
);

module.exports = mongoose.model("serviceType",serviceTypeSchema)