const appointmentService = require("../../services/appointment/appointment.service");
const { sendAppointmentCreatedNotifications } = require("../../utils/appointmentNotifications");


exports.createAppointment = async (req, res, next) => {
  try {
    const payload = Object.assign({}, req.body);
    // allow nested route: /shops/:shopId/appointments
    if (req.params?.shopId) payload.shopId = req.params.shopId;
    if (req.params?.serviceId) payload.serviceId = req.params.serviceId;
    // default attendeeId to authenticated user if not provided
    if (!payload.attendeeId && req.user?.userId)
      payload.attendeeId = req.user.userId;

    const appointment = await appointmentService.createAppointment({
      userId: req.user.userId,
      payload,
    });

    await sendAppointmentCreatedNotifications(appointment);

    return res
      .status(201)
      .json({ message: "Appointment created", appointment });
  } catch (error) {
    console.error("Appointment.createAppointment error:", error);
    next(error);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
    };

    const appointments = await appointmentService.getAppointments({
      tenantId: req.user.tenantId,
      attendeeId: req.query.attendeeId,
      filters,
    });

    return res.status(200).json({ count: appointments.length, appointments });
  } catch (error) {
    console.error("Appointment.getAppointments error:", error);
    next(error);
  }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
    });

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Appointment.getAppointmentById error:", error);
    next(error);
  }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: req.body,
    });

    return res
      .status(200)
      .json({ message: "Appointment updated", appointment });
  } catch (error) {
    console.error("Appointment.updateAppointment error:", error);
    next(error);
  }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    await appointmentService.deleteAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
    });

    return res.status(200).json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("Appointment.deleteAppointment error:", error);
    next(error);
  }
};
