const appointmentService = require('../../services/appointment/appointment.service');

exports.getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getAppointments({
      tenantId: req.user.tenantId,
      filters: req.query || {},
    });
    return res.status(200).json({ count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

exports.getPendingAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getAppointments({
      tenantId: req.user.tenantId,
      filters: { status: 'pending' },
    });
    return res.status(200).json({ count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next, status) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: { status },
    });
    return res.status(200).json({ message: `Appointment ${status}`, appointment });
  } catch (error) {
    next(error);
  }
};

exports.acceptAppointment = (req, res, next) => updateStatus(req, res, next, 'confirmed');
exports.rejectAppointment = (req, res, next) => updateStatus(req, res, next, 'rejected');
exports.completeAppointment = (req, res, next) => updateStatus(req, res, next, 'completed');
