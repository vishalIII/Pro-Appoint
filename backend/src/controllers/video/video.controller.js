const videoService = require("../../services/video/video.service");

exports.joinMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    const userId = req.user._id.toString();
    const userName = req.user.name;

    if (!appointment.meeting?.roomId) {
      return res.status(400).json({ message: "Meeting not initialized" });
    }

    // ✅ Authorization (provider or customer only)
    const isProvider = appointment.tenantId.toString() === userId;
    const isCustomer = appointment.attendeeId.toString() === userId;

    if (!isProvider && !isCustomer) {
      return res.status(403).json({
        message: "You are not authorized to join this meeting",
      });
    }

    // ✅ Require paid & confirmed
    if (appointment.paymentStatus !== "paid") {
      return res
        .status(400)
        .json({ message: "Payment is required before joining the meeting" });
    }
    if (appointment.status !== "confirmed") {
      return res.status(400).json({ message: "Appointment not confirmed" });
    }

    const role = isProvider ? "host" : "attendee";

    // ✅ Time window (−10m to end)
    const start = new Date(appointment.startTimeUTC);
    const end = new Date(appointment.endTimeUTC);
    const now = new Date();
    const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

    if (now < windowStart) {
      return res.status(400).json({
        message: "You can join only 10 minutes before start",
      });
    }

    if (now > end) {
      return res.status(400).json({
        message: "Meeting already ended",
      });
    }

    // ✅ Participant limit (max 2 unique users)
    appointment.meeting.participants =
      appointment.meeting.participants || [];

    const existing = appointment.meeting.participants.find(
      (p) => p.userId && p.userId.toString() === userId,
    );

    const uniqueUsers = new Set(
      appointment.meeting.participants
        .filter((p) => p?.userId)
        .map((p) => p.userId.toString()),
    );

    if (!existing && uniqueUsers.size >= 2) {
      return res.status(400).json({
        message: "Meeting is full",
      });
    }

    // ✅ Token TTL not beyond end time
    const ttlSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);
    if (ttlSeconds <= 0) {
      return res.status(400).json({
        message: "Session expired",
      });
    }

    const { token, expireAt } = videoService.generateToken({
      userId,
      roomId: appointment.meeting.roomId,
      role,
      ttlSeconds,
    });

    // ✅ Track participant & attendance
    if (!existing) {
      appointment.meeting.participants.push({
        userId,
        role,
      });
    }

    appointment.attendance = appointment.attendance || {};
    if (isProvider) {
      appointment.attendance.providerJoined = true;
    } else {
      appointment.attendance.customerJoined = true;
    }

    // ✅ Start meeting when provider joins
    if (isProvider && !appointment.meeting.startedAt) {
      appointment.meeting.startedAt = now;
      appointment.meeting.status = "live";
    }

    if (!appointment.meeting.status) {
      appointment.meeting.status = "waiting";
    }

    await appointment.save();

    return res.json({
      success: true,
      token,
      roomId: appointment.meeting.roomId,
      appID: Number(process.env.ZEGO_APP_ID),
      userId,
      userName,
      role,
      expireAt,
      startTime: appointment.startTimeUTC,
      endTime: appointment.endTimeUTC,
    });
  } catch (err) {
    next(err);
  }
};

exports.startMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    const role = req.meetingRole || "attendee";

    if (role !== "host") {
      return res.status(403).json({ message: "Only host can start meeting" });
    }

    const now = new Date();
    appointment.meeting = appointment.meeting || {};

    if (!appointment.meeting.startedAt) {
      appointment.meeting.startedAt = now;
    }
    appointment.meeting.status = "live";

    await appointment.save();

    return res.json({
      success: true,
      message: "Meeting started",
      meeting: {
        roomId: appointment.meeting.roomId,
        status: appointment.meeting.status,
        startedAt: appointment.meeting.startedAt,
        endedAt: appointment.meeting.endedAt,
      },
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
