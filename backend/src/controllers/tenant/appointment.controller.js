const appointmentService = require("../../services/appointment/appointment.service");
const {
  sendAppointmentConfirmedNotification,
  sendAppointmentCancellationNotifications,
  sendAppointmentCompletedNotifications,
  sendAppointmentNoShowNotifications,
} = require("../../utils/appointmentNotifications");

// GET /api/tenant/appointments
exports.getAppointments = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      shopId: req.query.shopId,
    };

    const result = await appointmentService.getAppointments({
      tenantId: req.user.tenantId,
      attendeeId: req.query.attendeeId,
      filters,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      count: result.appointments.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
      appointments: result.appointments,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tenant/appointments/pending
exports.getPendingAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.getAppointments({
      tenantId: req.user.tenantId,
      filters: { status: "pending", shopId: req.query.shopId },
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      count: result.appointments.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
      appointments: result.appointments,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tenant/appointments/:appointmentId
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
    });

    return res.status(200).json({
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/accept
exports.acceptAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: {
        status: "confirmed",
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      },
    });

    await sendAppointmentConfirmedNotification(appointment);

    return res.status(200).json({
      message: "Appointment accepted",
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/reject
exports.rejectAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: {
        status: "rejected",
      },
    });

    return res.status(200).json({
      message: "Appointment rejected",
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/complete
exports.completeAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      updatePayload: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    await sendAppointmentCompletedNotifications(appointment);

    return res.status(200).json({
      message: "Appointment completed",
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/no-show
exports.markAppointmentNoShow = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markAppointmentNoShow({
      appointmentId: req.params.appointmentId,
      tenantId: req.user.tenantId,
      markedByUserId: req.user.userId,
    });

    await sendAppointmentNoShowNotifications(appointment);

    return res.status(200).json({
      message: "Appointment marked as no-show",
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/mark-paid
exports.markAppointmentPaid = async (req, res, next) => {
  try {
    const result = await appointmentService.confirmAppointmentPayment({
      appointmentId: req.params.appointmentId,
      paymentReference: req.body?.paymentReference,
      paymentGateway: req.body?.paymentGateway,
      paymentMethod: req.body?.paymentMethod,
      tenantId: req.user.tenantId,
    });

    if (result.paymentConflict) {
      return res.status(409).json({
        success: false,
        message:
          result.conflictReason ||
          "Payment marked but appointment could not be confirmed",
        appointment: result.appointment,
      });
    }

    return res.status(200).json({
      message: "Appointment payment marked as paid",
      appointment: result.appointment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tenant/appointments/:appointmentId/cancel
exports.cancelAppointment = async (req, res, next) => {
  try {
    const result = await appointmentService.cancelAppointment({
      appointmentId: req.params.appointmentId,
      actorType: "tenant",
      actorUserId: req.user.userId,
      actorTenantId: req.user.tenantId,
      reason: req.body?.reason,
    });

    await sendAppointmentCancellationNotifications(result.appointment, {
      initiator: "provider",
    });

    return res.status(200).json({
      message: "Appointment cancelled by tenant",
      refundEligible: result.refundEligible,
      refundPolicy: result.refundPolicy,
      appointment: result.appointment,
    });
  } catch (err) {
    next(err);
  }
};
