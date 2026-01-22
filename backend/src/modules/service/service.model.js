const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",          
      required: true,
    },

    ServiceName: {
      type: String,
      required: true,
      trim: true,
    },

    ServiceMode:{
        type: String,
        required: true,
        enum: ["Online","Offline"]
    },

    industry: {
      type: String,
      required: true,
      enum: ["doctor", "mentor", "teacher"], 
    },

    description: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
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

module.exports = mongoose.model("Business", ServiceSchema);
