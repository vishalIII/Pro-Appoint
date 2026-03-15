const express = require("express");

const router = express.Router();

const videoController = require("../../controllers/video/video.controller");

const auth = require("../../middlewares/auth.middleware");

const meetingAccess = require("../../middlewares/video/meetingAccess.middleware");

router.get(
  "/join/:appointmentId",
  auth,
  meetingAccess,
  videoController.joinMeeting
);

router.post(
  "/end/:appointmentId",
  auth,
  meetingAccess,
  videoController.endMeeting
);

module.exports = router;
