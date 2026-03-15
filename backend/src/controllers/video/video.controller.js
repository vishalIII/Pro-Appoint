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

    const windowStart = new Date(start.getTime() - 10 * 60 * 1000);
    const windowEnd = new Date(end.getTime() + 30 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      return res.status(400).json({
        message:
          "Meeting can be joined from 10 minutes before start until 30 minutes after end",
      });
    }

    const ttlSeconds = Math.max(
      300,
      Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
    );

    const { token, expireAt } = videoService.generateToken({
      userId,
      roomId: appointment.meeting.roomId,
      role,
      ttlSeconds,
    });

    // Update lifecycle fields
    let dirty = false;
    appointment.meeting = appointment.meeting || {};
    appointment.meeting.participants = appointment.meeting.participants || [];

    const existingParticipant = appointment.meeting.participants.find(
      (p) => p.userId && p.userId.toString() === userId,
    );
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

    if (role === "host" && !appointment.meeting.startedAt) {
      appointment.meeting.startedAt = now;
      appointment.meeting.status = "live";
      dirty = true;
    }

    // Ensure meeting status reflects state
    if (!appointment.meeting.status) {
      appointment.meeting.status = "waiting";
      dirty = true;
    }

    if (dirty) {
      await appointment.save();
    } else {
      await appointment.save(); // still persist join log
    }

    res.json({
      token,
      roomId: appointment.meeting.roomId,
      appID: Number(process.env.ZEGO_APP_ID),
      role,
      expireAt,
      meetingStatus: appointment.meeting.status,
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

    if (appointment.meeting.startedAt) {
      appointment.status = "completed";
    } else {
      appointment.status = "no_show";
    }

    await appointment.save();

    res.json({
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
