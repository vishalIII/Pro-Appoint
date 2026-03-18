const onlineAppointmentService = require("../../services/appointment/onlineAppointment.service");

exports.createOnlineAppointment = async (req, res, next) => {
  try {
    const appointment = await onlineAppointmentService.createOnlineAppointment({
      userId: req.user.id,
      tenantId: req.tenantId,
      payload: req.body,
    });

    res.json(appointment);
  } catch (err) {
    next(err);
  }
};

exports.confirmOnlineAppointment = async (req, res, next) => {
  try {
    const appointment =
      await onlineAppointmentService.confirmOnlineAppointment({
        appointmentId: req.params.appointmentId,
        approvedBy: req.user.id,
      });

    res.json(appointment);
  } catch (err) {
    next(err);
  }
};


const Appointment = require("../../models/appointment/appointment.model");

exports.startMeeting = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.meeting.status = "live";
    appointment.meeting.startedAt = new Date();

    await appointment.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.endMeeting = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.meeting.status = "ended";
    appointment.meeting.endedAt = new Date();

    await appointment.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


// const Appointment = require("../../models/appointment/appointment.model");
exports.joinOnlineMeeting = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.meeting?.roomId) {
      return res.status(400).json({ message: "Meeting not available yet" });
    }

    const start = new Date(appointment.startTimeUTC);
    const end = new Date(appointment.endTimeUTC);
    const now = new Date();

    const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

    // ❌ Early join block
    if (now < windowStart) {
      return res.status(400).json({
        message: "You can join only 10 minutes before the session starts",
      });
    }

    // ❌ Late join block
    if (now > end) {
      return res.status(400).json({
        message: "Meeting has already ended",
      });
    }

    // ✅ SUCCESS RESPONSE (IMPORTANT)
    return res.json({
      roomId: appointment.meeting.roomId,
      userId: req.user?.id || `guest-${Date.now()}`,
      userName: req.user?.name || "Guest",

      // 🔥 ADD THESE
      startTime: appointment.startTimeUTC,
      endTime: appointment.endTimeUTC,
    });

  } catch (err) {
    next(err);
  }
};