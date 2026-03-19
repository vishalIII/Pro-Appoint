const express = require("express");
const router = express.Router();

const videoController = require("../../controllers/video/video.controller");
const auth = require("../../middlewares/auth.middleware");
const meetingAccess = require("../../middlewares/video/meetingAccess.middleware");

// Token endpoint (alias for video join) - keeps meeting namespace stable
router.get(
  "/token/:appointmentId",
  auth,
  meetingAccess,
  videoController.joinMeeting
);

// Leave hook to free slots
router.post(
  "/leave/:appointmentId",
  auth,
  meetingAccess,
  videoController.leaveMeeting
);

module.exports = router;
