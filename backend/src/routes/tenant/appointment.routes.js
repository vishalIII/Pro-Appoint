const express = require("express");
const router = express.Router();

const appointmentController = require("../../controllers/tenant/appointment.controller");

// GET all appointments
router.get("/", appointmentController.getAppointments);

// GET pending appointments
router.get("/pending", appointmentController.getPendingAppointments);

// GET appointment by ID
router.get("/:appointmentId", appointmentController.getAppointmentById);

// Accept appointment
router.patch("/:appointmentId/accept", appointmentController.acceptAppointment);

// Reject appointment
router.patch("/:appointmentId/reject", appointmentController.rejectAppointment);

// Complete appointment
router.patch("/:appointmentId/complete", appointmentController.completeAppointment);

// Mark payment as paid (tenant/manual/offline)
router.patch("/:appointmentId/mark-paid", appointmentController.markAppointmentPaid);

// Mark no-show
router.patch("/:appointmentId/no-show", appointmentController.markAppointmentNoShow);

// Cancel appointment (tenant initiated)
router.patch("/:appointmentId/cancel", appointmentController.cancelAppointment);




// // const appointmentController = require("../../controllers/provider/appointment.controller");
// const onlineAppointmentController = require("../../controllers/appointment/onlineAppointment.controller");
// // Provider start meeting
// router.post(
//   "/:appointmentId/start-meeting",
//   onlineAppointmentController.startMeeting
// );

// // Provider end meeting
// router.post(
//   "/:appointmentId/end-meeting",
//   onlineAppointmentController.endMeeting
// );

module.exports = router;
