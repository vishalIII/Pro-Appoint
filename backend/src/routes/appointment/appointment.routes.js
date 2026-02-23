const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} = require("../../controllers/appointment/appointment.controller");

router.get("/check", (req, res) => res.send("Appointment API working"));

router.post("/", createAppointment);
router.get("/", getAppointments);
router.get("/:appointmentId", getAppointmentById);
router.patch("/:appointmentId", updateAppointment);
router.delete("/:appointmentId", deleteAppointment);

module.exports = router;
