const express = require("express");
const router = express.Router();

const onlineAppointmentController = require("../../controllers/appointment/onlineAppointment.controller");

const auth = require("../../middlewares/auth.middleware");
const meetingAccess = require("../../middlewares/video/meetingAccess.middleware");

// Join meeting (user or provider)
router.get(
  "/join/:appointmentId",
  // auth,
  // meetingAccess,
  onlineAppointmentController.joinOnlineMeeting
);

// Provider starts meeting
router.post(
  "/start/:appointmentId",
  // auth,
  meetingAccess,
  onlineAppointmentController.startMeeting
);

// Provider ends meeting
router.post(
  "/end/:appointmentId",
  // auth,
  // meetingAccess,
  onlineAppointmentController.endMeeting
);

module.exports = router;