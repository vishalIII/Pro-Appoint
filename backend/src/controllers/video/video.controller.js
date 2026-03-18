const videoService = require("../../services/video/video.service");

exports.joinMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    const userId = req.user._id.toString();
    const role = req.meetingRole || "attendee";

    if (!appointment.meeting?.roomId) {
      return res.status(400).json({ message: "Meeting not initialized" });
    }

    const start = new Date(appointment.startTimeUTC);
    const end = new Date(appointment.endTimeUTC);
    const now = new Date();

    // ✅ Allow only 10 minutes before start
    const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

    if (now < windowStart) {
      return res.status(400).json({
        message: "You can join only 10 minutes before the session starts",
      });
    }

    // ❌ Prevent joining after end time
    if (now > end) {
      return res.status(400).json({
        message: "Meeting has already ended",
      });
    }

    // ✅ Token valid only till endTime
    const ttlSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);

    if (ttlSeconds <= 0) {
      return res.status(400).json({
        message: "Session expired",
      });
    }

    // ✅ Participant handling
    appointment.meeting = appointment.meeting || {};
    appointment.meeting.participants =
      appointment.meeting.participants || [];

    const existingParticipant = appointment.meeting.participants.find(
      (p) => p.userId && p.userId.toString() === userId
    );

    // ✅ Optional: limit to 10 users
    if (
      !existingParticipant &&
      appointment.meeting.participants.length >= 10 &&
      role !== "host"
    ) {
      return res.status(400).json({
        message: "Meeting is full (max 10 participants)",
      });
    }

    // ✅ Generate token
    const { token, expireAt } = videoService.generateToken({
      userId,
      roomId: appointment.meeting.roomId,
      role,
      ttlSeconds,
    });

    // ✅ Track join
    if (existingParticipant) {
      existingParticipant.role = role;
      existingParticipant.joinEvents =
        existingParticipant.joinEvents || [];

      existingParticipant.joinEvents.push({
        at: now,
        action: "join",
      });
    } else {
      appointment.meeting.participants.push({
        userId,
        role,
        joinEvents: [{ at: now, action: "join" }],
      });
    }

    // ✅ Host starts meeting
    if (role === "host" && !appointment.meeting.startedAt) {
      appointment.meeting.startedAt = now;
      appointment.meeting.status = "live";
    }

    // ✅ Default status
    if (!appointment.meeting.status) {
      appointment.meeting.status = "waiting";
    }

    await appointment.save();
    // console.log("JOIN MEETING CONTROLLER HIT");
    return res.json({
      success: true,
      token,
      roomId: appointment.meeting.roomId,
      appID: Number(process.env.ZEGO_APP_ID),
      role,
      expireAt,
      meetingStatus: appointment.meeting.status,
      startTime: appointment.startTimeUTC,
      endTime: appointment.endTimeUTC, // 🔥 required for frontend auto-end
    });
  } catch (err) {
    next(err);
  }
};

exports.endMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    const role = req.meetingRole || "attendee";

    if (role !== "host") {
      return res.status(403).json({ message: "Only host can end meeting" });
    }

    const now = new Date();

    appointment.meeting = appointment.meeting || {};
    appointment.meeting.endedAt = now;
    appointment.meeting.status = "ended";

    // ✅ Appointment status update
    if (appointment.meeting.startedAt) {
      appointment.status = "completed";
    } else {
      appointment.status = "no_show";
    }

    await appointment.save();

    return res.json({
      success: true,
      message: "Meeting ended",
      meeting: {
        roomId: appointment.meeting.roomId,
        status: appointment.meeting.status,
        startedAt: appointment.meeting.startedAt,
        endedAt: appointment.meeting.endedAt,
      },
      appointmentStatus: appointment.status,
    });
  } catch (err) {
    next(err);
  }
};