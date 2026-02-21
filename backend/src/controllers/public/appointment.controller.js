const appointmentService = require('../../services/appointment/appointment.service');
const AppError = require('../../utils/appError');

exports.createAppointment = async (req, res, next) => {
  try {
    const payload = Object.assign({}, req.body);
    if (req.params?.shopId) payload.shopId = req.params.shopId;
    if (!payload.attendeeId && req.user?.userId) payload.attendeeId = req.user.userId;

    const appointment = await appointmentService.createAppointment({
      userId: req.user?.userId,
      tenantId: undefined, // public flow derives tenant from shop
      payload,
    });

    return res.status(201).json({ message: 'Appointment created', appointment });
  } catch (error) {
    next(error);
  }
};

exports.getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getAppointments({
      attendeeId: req.user.userId,
    });
    return res.status(200).json({ count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById({
      appointmentId: req.params.appointmentId,
    });
    return res.status(200).json(appointment);
  } catch (error) {
    next(error);
  }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    await appointmentService.deleteAppointment({ appointmentId: req.params.appointmentId });
    return res.status(200).json({ message: 'Appointment cancelled' });
  } catch (error) {
    next(error);
  }
};
