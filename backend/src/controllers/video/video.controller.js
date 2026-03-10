const videoService = require("../../services/video/video.service");

exports.joinMeeting = async (req, res, next) => {

  try {

    const appointment = req.appointment;

    const userId = req.user._id.toString();

    const now = Date.now();

    const allowedJoinTime =
      new Date(appointment.startTimeUTC).getTime() - 5 * 60 * 1000;

    if (now < allowedJoinTime) {
      return res.status(400).json({
        message: "Meeting can be joined 5 minutes before start time"
      });
    }

    const token = videoService.generateToken(
      userId,
      appointment.meeting.roomId
    );

    res.json({
      token,
      roomId: appointment.meeting.roomId,
      appID: process.env.ZEGO_APP_ID
    });

  } catch (err) {
    next(err);
  }

};