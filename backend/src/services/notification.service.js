const Notification = require("../models/notification/notification.model")
const { getIO } = require("../socket/socket")

async function sendNotification(payload){

   const notification = await Notification.create(payload)

   const io = getIO()

   io.to(payload.userId.toString())
     .emit("notification", notification)

   return notification
}

module.exports = { sendNotification }