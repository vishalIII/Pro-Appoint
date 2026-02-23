const express = require('express');
const router = express.Router();
const appointmentController = require('../../controllers/appointment/appointment.controller');

// POST /api/public/appointments -> Book appointment (body must include shopId/serviceId)
router.post('/appointments', appointmentController.createAppointment);

// GET /api/public/appointments/my -> My bookings (authenticated user)
router.get('/appointments/my', (req, res, next) => {
  // reuse existing controller but set attendeeId to authenticated user
  req.query.attendeeId = req.user?.userId;
  return appointmentController.getAppointments(req, res, next);
});

// GET /api/public/appointments/:appointmentId -> view single booking
router.get('/appointments/:appointmentId', appointmentController.getAppointmentById);

// DELETE /api/public/appointments/:appointmentId -> cancel booking
router.delete('/appointments/:appointmentId', appointmentController.deleteAppointment);

module.exports = router;
