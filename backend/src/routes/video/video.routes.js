const express = require("express");
const router = express.Router();

const videoController = require("../../controllers/video/video.controller");

const auth = require("../../middlewares/auth.middleware");
const meetingAccess = require("../../middlewares/video/meetingAccess.middleware");

// Join meeting (user or provider)
router.get(
  "/join/:appointmentId",
  auth,
  meetingAccess,
  videoController.joinMeeting
);

// Provider starts meeting
router.post(
  "/start/:appointmentId",
  auth,
  meetingAccess,
  videoController.startMeeting
);

// Provider ends meeting
router.post(
  "/end/:appointmentId",
  auth,
  meetingAccess,
  videoController.endMeeting
);

module.exports = router;
