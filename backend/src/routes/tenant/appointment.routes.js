const express = require("express");
const router = express.Router();

const appointmentController = require("../../controllers/tenant/appointment.controller");

// GET all appointments
router.get("/", appointmentController.getAppointments);

// GET pending appointments
router.get("/pending", appointmentController.getPendingAppointments);

// Accept appointment
router.patch("/:appointmentId/accept", appointmentController.acceptAppointment);

// Reject appointment
router.patch("/:appointmentId/reject", appointmentController.rejectAppointment);

// Complete appointment
router.patch("/:appointmentId/complete", appointmentController.completeAppointment);

module.exports = router;