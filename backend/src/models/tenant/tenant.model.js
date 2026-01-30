const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema(
  {
    ServiceName: {
      type: String,
      required: true,
      trim: true,
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
      match: [/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format']
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

    documents: {
      gst: { type: String },
      license: { type: String },
      other: [{ type: String }],
    },

    //rejection or blocked reason-------> auditability + clarity.
    statusMeta: {
      reason: { 
        type: String,
        required: function () {
          return ["rejected", "blocked"].includes(this.status);
        },
      },
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
          return ["rejected", "blocked"].includes(this.status);
        },
      },
      at: {
        type: Date,
        default: Date.now,
      },
    },


  },
  { timestamps: true }
);

module.exports = mongoose.model("tenant", TenantSchema);
