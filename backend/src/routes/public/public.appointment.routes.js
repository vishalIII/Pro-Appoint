const express = require('express');
const router = express.Router({ mergeParams: true });
const appointmentController = require('../../controllers/public/appointment.controller');

// POST /api/public/appointments -> Book appointment (body must include shopId/serviceId)
router.post('/', appointmentController.createAppointment);

// GET /api/public/appointments/my -> My bookings (authenticated user)
router.get('/', (req, res, next) => {
  return appointmentController.getMyAppointments(req, res, next);
});

// GET .../appointments/:appointmentId -> view single booking
router.get('/:appointmentId', appointmentController.getAppointmentById);

// POST .../appointments/:appointmentId/review -> review completed appointment
router.post('/:appointmentId/review', appointmentController.createAppointmentReview);

// PATCH .../appointments/:appointmentId -> update booking
router.patch('/:appointmentId', appointmentController.updateAppointment);
router.patch('/:appointmentId/cancel', appointmentController.cancelAppointment);

// DELETE .../appointments/:appointmentId -> cancel booking
router.delete('/:appointmentId', appointmentController.deleteAppointment);

module.exports = router;
