const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    password: {
      type: String,
      required: true,
      select: false // it's for hiding password by default
    },

    role: {
      type: String,
      enum: ["Customer", "ServiceProvider", "Admin"],
      default: "Customer"
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",

      required: function () {
        return this.role === "provider";
      },

      validate: {
        validator: function (value) {
          if (this.role === "provider") return !!value; // must exist
          return !value; // admin & customer must NOT have tenantId
        },
        message: "Only service providers can belong to a tenant",
      },
    },

    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
