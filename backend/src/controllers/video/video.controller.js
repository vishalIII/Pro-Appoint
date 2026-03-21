const videoService = require("../../services/video/video.service");
const Service = require("../../models/service/service.model");
const User = require("../../models/user/user.model");
const participantTracker = require("../../services/video/participantTracker");

const deriveMaxParticipants = async (appointment) => {
  // Treat configured capacities as attendee seats and always include host seat.
  const service =
    (appointment.serviceId &&
      (await Service.findById(appointment.serviceId)
        .select("onlineCapacity capacity")
        .lean())) ||
    null;

  const attendeeSeats =
    appointment.maxParticipants ||
    appointment.meeting?.maxParticipants ||
    appointment.capacitySnapshot ||
    service?.onlineCapacity ||
    service?.capacity ||
    1;

  // +1 for host seat; ensure at least 2 total (host + one attendee).
  const totalSeats = Math.max(2, attendeeSeats + 1);
  return totalSeats;
};

const getUserId = (req) => String(req.user?.userId || req.user?._id || req.user?.id);

exports.joinMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.meeting?.roomId) {
      return res.status(400).json({ message: "Meeting not initialized" });
    }

    if (appointment.meeting?.status === "ended") {
      return res.status(400).json({ message: "Meeting already ended" });
    }

    const userId = getUserId(req);
    const user = await User.findById(userId).select("name");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const start = new Date(appointment.startTimeUTC);
    const end = new Date(appointment.endTimeUTC);
    const now = new Date();
    const earlyMs =
      Number(process.env.MEETING_EARLY_MINUTES || 0) * 60 * 1000;
    const lateMs = Number(process.env.MEETING_LATE_MINUTES || 0) * 60 * 1000;
    const windowStart = new Date(start.getTime() - earlyMs);
    const windowEnd = new Date(end.getTime() + lateMs);

    if (now < windowStart || now > windowEnd) {
      return res.status(403).json({
        message: "Meeting not active right now",
        windowStart,
        windowEnd,
      });
    }

    const roomId = appointment.meeting.roomId;
    const maxParticipants = await deriveMaxParticipants(appointment);
    const alreadyActive = participantTracker.hasUser(roomId, userId);
    const activeCount = participantTracker.count(roomId);

    if (!alreadyActive && activeCount >= maxParticipants) {
      return res.status(403).json({ message: "Room is full" });
    }

    const isTenantHost = appointment.tenantId?.toString() === userId;
    const role = isTenantHost ? "host" : "participant";

    const { token, expireAt } = videoService.generateToken({
      userId,
      userName: user.name,
      roomId,
      role,
      ttlSeconds: 3600,
    });

    // Update lifecycle fields
    appointment.meeting = appointment.meeting || {};
    appointment.meeting.participants = appointment.meeting.participants || [];

    const existingParticipant = appointment.meeting.participants.find(
      (p) => p.userId && p.userId.toString() === userId,
    );

    if (existingParticipant) {
      existingParticipant.role = role;
      existingParticipant.userName = user.name;
      existingParticipant.joinEvents = existingParticipant.joinEvents || [];
      existingParticipant.joinEvents.push({ at: now, action: "join" });
    } else {
      appointment.meeting.participants.push({
        userId,
        userName: user.name,
        role,
        joinEvents: [{ at: now, action: "join" }],
      });
    }

    // Track first joins explicitly for lifecycle jobs (decoupled from role)
    if (!appointment.meeting.hostJoinedAt && isTenantHost) {
      appointment.meeting.hostJoinedAt = now;
    }

    if (!appointment.meeting.attendeeJoinedAt && !isTenantHost) {
      appointment.meeting.attendeeJoinedAt = now;
    }

    if (role === "host" && !appointment.meeting.startedAt) {
      appointment.meeting.startedAt = now;
      appointment.meeting.status = "live";
    }

    if (!appointment.meeting.status) {
      appointment.meeting.status = "waiting";
    }

    await appointment.save();

    if (!alreadyActive) {
      participantTracker.addUser(roomId, userId, { userName: user.name, role });
    }

    return res.json({
      token,
      roomId,
      userId,
      userName: user.name,
      role,
      expireAt,
    });
  } catch (err) {
    next(err);
  }
};

exports.leaveMeeting = async (req, res, next) => {
  try {
    const appointment = req.appointment;
    if (!appointment?.meeting?.roomId) {
      return res.status(400).json({ message: "Meeting not initialized" });
    }

    const userId = getUserId(req);
    const now = new Date();
    const roomId = appointment.meeting.roomId;

    participantTracker.removeUser(roomId, userId);

    if (Array.isArray(appointment.meeting.participants)) {
      const participant = appointment.meeting.participants.find(
        (p) => p.userId && p.userId.toString() === userId,
      );
      if (participant) {
        participant.joinEvents = participant.joinEvents || [];
        participant.joinEvents.push({ at: now, action: "leave" });
      }
    }

    // Clear explicit flags on leave if no one else is in the room
    const remaining = participantTracker.count(roomId);
    if (remaining === 0) {
      // keep historical flags; do not reset hostJoinedAt/attendeeJoinedAt
      appointment.meeting.status =
        appointment.meeting.status === "live"
          ? "waiting"
          : appointment.meeting.status;
    }

    await appointment.save();

    return res.json({
      success: true,
      activeCount: participantTracker.count(roomId),
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

    appointment.status = appointment.meeting.startedAt
      ? "manual_completed"
      : "no_show";

    await appointment.save();
    participantTracker.clearRoom(appointment.meeting.roomId);

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
