const express = require("express");
const router = express.Router();

const onlineAppointmentController = require("../../controllers/appointment/onlineAppointment.controller");
const videoController = require("../../controllers/video/video.controller");
const webhookController = require("../../controllers/video/webhook.controller");

const auth = require("../../middlewares/auth.middleware");
const meetingAccess = require("../../middlewares/video/meetingAccess.middleware");
const verifyZegoWebhook = require("../../middlewares/video/verifyZegoWebhook.middleware");

const rawBodyParser = express.raw({ type: "*/*" });

// ZEGOCLOUD Webhook (public, signature verified)
router.post("/webhook", rawBodyParser, verifyZegoWebhook, webhookController.handleZegoWebhook);

// Authenticated routes
// Join meeting (user or provider)
router.get("/join/:appointmentId", auth, meetingAccess, videoController.joinMeeting);

// Provider starts meeting
router.post("/start/:appointmentId", auth, meetingAccess, onlineAppointmentController.startMeeting);

// Provider ends meeting
router.post("/end/:appointmentId", auth, meetingAccess, videoController.endMeeting);

// Explicit leave hook to free participant slot
router.post("/leave/:appointmentId", auth, meetingAccess, videoController.leaveMeeting);

module.exports = router;

