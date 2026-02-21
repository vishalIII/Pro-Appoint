const express = require('express');
const router = express.Router();
const appointmentService = require('../../services/appointment/appointment.service');

// GET /api/tenant/appointments -> all appointments for tenant
router.get('/', async (req, res, next) => {
  try {
    const filters = { status: req.query.status, from: req.query.from, to: req.query.to };
    const appointments = await appointmentService.getAppointments({ tenantId: req.user.tenantId, attendeeId: req.query.attendeeId, filters });
    return res.status(200).json({ count: appointments.length, appointments });
  } catch (err) { next(err); }
});

// GET /api/tenant/appointments/pending
router.get('/pending', async (req, res, next) => {
  try {
    const filters = { status: 'pending' };
    const appointments = await appointmentService.getAppointments({ tenantId: req.user.tenantId, filters });
    return res.status(200).json({ count: appointments.length, appointments });
  } catch (err) { next(err); }
});

// PATCH /api/tenant/appointments/:appointmentId/accept
router.patch('/:appointmentId/accept', async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: { status: 'confirmed', approvedBy: req.user.userId, approvedAt: new Date() },
    });
    return res.status(200).json({ message: 'Appointment accepted', appointment });
  } catch (err) { next(err); }
});

// PATCH /api/tenant/appointments/:appointmentId/reject
router.patch('/:appointmentId/reject', async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: { status: 'rejected' },
    });
    return res.status(200).json({ message: 'Appointment rejected', appointment });
  } catch (err) { next(err); }
});

// PATCH /api/tenant/appointments/:appointmentId/complete
router.patch('/:appointmentId/complete', async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: { status: 'completed', completedAt: new Date() },
    });
    return res.status(200).json({ message: 'Appointment completed', appointment });
  } catch (err) { next(err); }
});

module.exports = router;
 
