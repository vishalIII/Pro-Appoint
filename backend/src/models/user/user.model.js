const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // it's for hiding password by default
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    role: {
      type: String,
      enum: ["Customer", "ServiceProvider", "Admin"],
      default: "Customer",
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenant",

      required: function () {
        return this.role === "ServiceProvider";
      },

      validate: {
        validator: function (value) {
          //value is bydefault , value is tenantId , validator(this.tenantId) , value === this.tenantId
          if (this.role === "ServiceProvider") return !!value; // must exist
          return !value; // admin & customer must NOT have tenantId
        },
        message: "Only service providers can belong to a tenant",
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    intent: {
      type: String,
      enum: ["provider"],
      default: null,
    },
  },

  { timestamps: true },
);

module.exports = mongoose.model("user", userSchema);
