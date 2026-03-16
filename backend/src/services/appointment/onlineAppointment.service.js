const Appointment = require("../../models/appointment/appointment.model");
const generateRoomId = require("../../utils/meeting/generateRoomId");

exports.createOnlineAppointment = async ({ userId, tenantId, payload }) => {

  const appointment = await Appointment.create({
    ...payload,
    tenantId,
    attendeeId: userId,
    mode: "online",
    status: "pending",
  });

  return appointment;
};


exports.confirmOnlineAppointment = async ({ appointmentId }) => {

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.isGroup) {

    const existingRoom = await Appointment.findOne({
      serviceId: appointment.serviceId,
      startTimeUTC: appointment.startTimeUTC,
      isGroup: true,
      "meeting.roomId": { $exists: true },
    });

    if (existingRoom) {
      appointment.meeting = existingRoom.meeting;
    } else {
      appointment.meeting = {
        roomId: generateRoomId(
          appointment._id,
          appointment.startTimeUTC
        ),
        status: "waiting",
      };
    }

  } else {

    appointment.meeting = {
      roomId: generateRoomId(
        appointment._id,
        appointment.startTimeUTC
      ),
      status: "waiting",
    };

  }

  appointment.status = "confirmed";

  await appointment.save();

  return appointment;
};