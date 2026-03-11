const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true,
        index:true,
    },

    type:{
        type:String,
        enum: [
        "appointment_created",
        "appointment_confirmed",
        "appointment_cancelled",
        "appointment_completed",
        "appointment_no_show",
        "appointment_rescheduled",
        "appointment_reminder",
        "payment_success",
        "payment_failed",
      ],
      required:true,
      index:true,
    },

    title:{
        type:String,
        required:true,
        maxlength: 120,
    },

    message:{
        type:String,
        required: true,
        maxlength: 1000,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      // e.g. { appointmentId, route: "/appointments/123" }
      //for anykind of data or links
    },

    isRead:{
        type:Boolean,
        default:false,
        index: true,
    },

     // to avoid duplicate notifications
    deDupKey: {
      type: String,
      index: true,
      sparse: true,  //Index this field, but only when it exists.
    },


},
    {timestamps:true}
)

module.exports = mongoose.model("notification",notificationSchema)
