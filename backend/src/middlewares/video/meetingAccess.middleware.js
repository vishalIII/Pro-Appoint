const Appointment = require("../models/appointment/appointment.model");

async function meetingAccess(req, res, next) {

  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  if (appointment.mode !== "online") {
    return res.status(400).json({ message: "Offline appointment" });
  }

  if (appointment.status !== "confirmed") {
    return res.status(400).json({ message: "Appointment not confirmed" });
  }

  const userId = req.user._id.toString();

  const isParticipant =
    appointment.attendeeId.toString() === userId ||
    appointment.tenantId.toString() === userId;

  if (!isParticipant) {
    return res.status(403).json({ message: "Not allowed to join meeting" });
  }

  req.appointment = appointment;

  next();

}

module.exports = meetingAccess;