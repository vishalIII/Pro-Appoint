const express = require("express");
const router = express.Router({ mergeParams: true });
const { listServices, getServiceByIdPublic } = require("../../controllers/public/service.controller");
const publicAppointmentController = require("../../controllers/public/appointment.controller");
const authMiddleware = require("../../middlewares/auth.middleware")

router.get("/", listServices);
router.get("/:serviceId/slots", publicAppointmentController.getAvailableSlots);
router.get("/:serviceId", getServiceByIdPublic);


const publicAppointmentRoutes = require("./public.appointment.routes");
router.use(
  "/:serviceId/appointments", authMiddleware,
  publicAppointmentRoutes
);


module.exports = router;
