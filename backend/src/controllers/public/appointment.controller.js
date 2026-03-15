const appointmentService = require('../../services/appointment/appointment.service');
const reviewService = require('../../services/review/review.service');
const {
  sendAppointmentCreatedNotifications,
  sendAppointmentCancellationNotifications,
} = require("../../utils/appointmentNotifications");

exports.createAppointment = async (req, res, next) => {
  try {
    const payload = Object.assign({}, req.body);
    if (req.params?.shopId) payload.shopId = req.params.shopId;
    if (req.params?.serviceId) payload.serviceId = req.params.serviceId;
    if (!payload.attendeeId && req.user?.userId) payload.attendeeId = req.user.userId;

    const appointment = await appointmentService.createAppointment({
      userId: req.user?.userId,
      tenantId: undefined, // public flow derives tenant from shop
      payload,
    });

    await sendAppointmentCreatedNotifications(appointment);

    return res.status(201).json({ message: 'Appointment created', appointment });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const slotData = await appointmentService.getAvailableSlots({
      shopId: req.params.shopId,
      serviceId: req.params.serviceId,
      date: req.query.date,
      slotIntervalMinutes: req.query.slotIntervalMinutes,
      attendeeId: req.user?.userId,
    });

    return res.status(200).json(slotData);
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
    const result = await appointmentService.cancelAppointment({
      appointmentId: req.params.appointmentId,
      actorType: "customer",
      actorUserId: req.user.userId,
      reason: req.body?.reason,
    });

    await sendAppointmentCancellationNotifications(result.appointment, {
      initiator: "customer",
    });

    return res.status(200).json({
      message: "Appointment cancelled",
      refundEligible: result.refundEligible,
      refundPolicy: result.refundPolicy,
      appointment: result.appointment,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const result = await appointmentService.cancelAppointment({
      appointmentId: req.params.appointmentId,
      actorType: "customer",
      actorUserId: req.user.userId,
      reason: req.body?.reason,
    });

    await sendAppointmentCancellationNotifications(result.appointment, {
      initiator: "customer",
    });

    return res.status(200).json({
      message: "Appointment cancelled",
      refundEligible: result.refundEligible,
      refundPolicy: result.refundPolicy,
      appointment: result.appointment,
    });
  } catch (error) {
    next(error);
  }
};

exports.createAppointmentReview = async (req, res, next) => {
  try {
    const result = await reviewService.createReviewForAppointment({
      appointmentId: req.params.appointmentId,
      reviewerId: req.user.userId,
      payload: req.body,
    });

    return res.status(201).json({
      message: "Review created",
      review: result.review,
      shopSummary: result.shopSummary,
    });
  } catch (error) {
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
