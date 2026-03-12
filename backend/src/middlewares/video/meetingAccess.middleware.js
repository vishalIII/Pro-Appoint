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
    appointment.tenantId.toString() === userId ||
    (Array.isArray(appointment.attendees) &&
      appointment.attendees.some(
        (a) => a?.userId && a.userId.toString() === userId,
      ));

  if (!isParticipant) {
    return res.status(403).json({ message: "Not allowed to join meeting" });
  }

  req.meetingRole = appointment.tenantId.toString() === userId ? "host" : "attendee";
  req.appointment = appointment;

  next();

}

module.exports = meetingAccess;
