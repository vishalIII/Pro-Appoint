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
  if (appointment.mode === "online" && !appointment.meeting?.roomId) {
    appointment.meeting = {
      platform: "zegocloud",
      roomId: generateRoomId(appointment._id, appointment.startTimeUTC),
      hostUserId: appointment.tenantId,
      status: "waiting",
      createdAt: new Date(),
      participants: [
        { userId: appointment.tenantId, role: "host" },
        ...(Array.isArray(appointment.attendees) && appointment.attendees.length > 0
          ? appointment.attendees.map((a) => ({
              userId: a.userId,
              role: "guest",
            }))
          : [{ userId: appointment.attendeeId, role: "guest" }]),
      ],
    };
  }

  await appointment.save({ session });

  return appointment;

};
