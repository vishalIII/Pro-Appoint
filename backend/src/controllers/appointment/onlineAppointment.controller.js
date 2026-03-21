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

    if (!appointment.meeting || !appointment.meeting.roomId) {
      return res.status(400).json({ message: "Meeting not available yet" });
    }

    res.json({
      roomId: appointment.meeting.roomId,
      userId: req.user?.id || `guest-${Date.now()}`,
      userName: req.user?.name || "Guest"
    });

  } catch (err) {
    next(err);
  }
};