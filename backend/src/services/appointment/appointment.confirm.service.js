const Appointment = require("../../models/appointment/appointment.model");
const generateRoomId = require("../../utils/meeting/generateRoomId");

exports.confirmAppointment = async (appointmentId, session) => {

  const appointment = await Appointment.findById(appointmentId).session(session);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "pending") {
    throw new Error("Appointment cannot be confirmed");
  }

  appointment.status = "confirmed";
  appointment.paymentStatus = "paid";

  // CREATE VIDEO MEETING ONLY IF ONLINE
  if (appointment.mode === "online") {

    appointment.meeting = {
      platform: "zegocloud",
      roomId: generateRoomId(appointment._id),
      hostUserId: appointment.tenantId,
      participants: [
        { userId: appointment.tenantId, role: "host" },
        { userId: appointment.attendeeId, role: "guest" }
      ]
    };

  }

  await appointment.save({ session });

  return appointment;

};