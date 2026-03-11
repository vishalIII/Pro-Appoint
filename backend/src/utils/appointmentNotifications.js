const mongoose = require("mongoose");
const Tenant = require("../models/tenant/tenant.model");
const { sendNotification } = require("../services/notification.service");

const safeToString = (value) => {
  if (value && typeof value.toString === "function") {
    return value.toString();
  }
  return null;
};

const formatAppointmentLabel = (appointment) => {
  if (!appointment || !appointment.startTimeUTC) {
    return "the scheduled time";
  }
  const date = new Date(appointment.startTimeUTC);
  const day = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
};

const buildNotificationData = (appointment, role) => {
  const appointmentId = appointment && appointment._id ? safeToString(appointment._id) : null;
  const serviceName =
    appointment && appointment.serviceId && appointment.serviceId.name
      ? appointment.serviceId.name
      : appointment && appointment.serviceName
      ? appointment.serviceName
      : "Service";
  const customerName =
    appointment && appointment.attendeeId && appointment.attendeeId.name
      ? appointment.attendeeId.name
      : appointment && appointment.attendeeId && appointment.attendeeId.email
      ? appointment.attendeeId.email
      : "Customer";
  const status = appointment && appointment.status ? appointment.status : "pending";

  return {
    appointmentId,
    route:
      role === "provider"
        ? `/tenant/appointments${appointmentId ? `?appointmentId=${appointmentId}` : ""}`
        : `/bookings${appointmentId ? `?appointmentId=${appointmentId}` : ""}`,
    serviceName,
    customerName,
    appointmentStart: formatAppointmentLabel(appointment),
    status,
  };
};

const resolveProviderUserId = async (appointment) => {
  if (!appointment) return null;
  const tenantValue = appointment.tenantId;
  if (!tenantValue) return null;

  if (typeof tenantValue === "object" && tenantValue.ownerId) {
    return safeToString(tenantValue.ownerId);
  }

  const idString = safeToString(tenantValue);
  if (!idString) return null;

  if (!mongoose.Types.ObjectId.isValid(idString)) {
    return idString;
  }

  const tenant = await Tenant.findById(idString).select("ownerId").lean();
  if (tenant && tenant.ownerId) {
    return safeToString(tenant.ownerId);
  }

  return idString;
};

const batchSendNotifications = (payloads = []) =>
  Promise.all(payloads.map((payload) => sendNotification(payload)));

const sendAppointmentCreatedNotifications = async (appointment) => {
  if (!appointment) return Promise.resolve(null);
  const providerUserId = await resolveProviderUserId(appointment);
  const providerData = buildNotificationData(appointment, "provider");
  const customerData = buildNotificationData(appointment, "customer");
  const startLabel = providerData.appointmentStart;

  const payloads = [
    providerUserId && {
      userId: providerUserId,
      type: "appointment_created",
      title: "New booking received",
      message: `New booking received for ${providerData.serviceName} on ${startLabel}.`,
      data: { ...providerData, status: "pending" },
    },
    {
      userId: appointment.attendeeId,
      type: "appointment_created",
      title: "Appointment request submitted",
      message: `Appointment request submitted. Your booking is pending confirmation.`,
      data: { ...customerData, status: "pending" },
    },
  ].filter(Boolean);

  return batchSendNotifications(payloads);
};

const sendAppointmentConfirmedNotification = async (
  appointment,
  { providerMessage = "Appointment confirmed successfully." } = {},
) => {
  if (!appointment) return Promise.resolve(null);
  const providerUserId = await resolveProviderUserId(appointment);
  const customerData = buildNotificationData(appointment, "customer");
  const providerData = buildNotificationData(appointment, "provider");

  const payloads = [
    {
      userId: appointment.attendeeId,
      type: "appointment_confirmed",
      title: "Appointment confirmed",
      message: `Your appointment for ${customerData.serviceName} on ${customerData.appointmentStart} has been confirmed.`,
      data: customerData,
    },
    providerUserId && {
      userId: providerUserId,
      type: "appointment_confirmed",
      title: "Appointment confirmed",
      message: providerMessage,
      data: providerData,
    },
  ].filter(Boolean);

  return batchSendNotifications(payloads);
};

const sendAppointmentCancellationNotifications = async (
  appointment,
  {
    initiator = "customer",
  } = {},
) => {
  if (!appointment) return Promise.resolve(null);
  const providerUserId = await resolveProviderUserId(appointment);
  const providerData = buildNotificationData(appointment, "provider");
  const customerData = buildNotificationData(appointment, "customer");
  const startLabel = providerData.appointmentStart;

  const customerMessage =
    initiator === "provider"
      ? `Your appointment for ${customerData.serviceName} on ${customerData.appointmentStart} was cancelled by the service provider.`
      : "Your appointment has been cancelled.";

  const providerMessage =
    initiator === "provider"
      ? "Appointment cancelled successfully."
      : `Customer cancelled appointment for ${providerData.serviceName} on ${startLabel}.`;

  const payloads = [
    {
      userId: appointment.attendeeId,
      type: "appointment_cancelled",
      title: "Appointment cancelled",
      message: customerMessage,
      data: customerData,
    },
    providerUserId && {
      userId: providerUserId,
      type: "appointment_cancelled",
      title: "Appointment cancelled",
      message: providerMessage,
      data: providerData,
    },
  ].filter(Boolean);

  return batchSendNotifications(payloads);
};

const sendAppointmentCompletedNotifications = async (appointment) => {
  if (!appointment) return Promise.resolve(null);
  const providerUserId = await resolveProviderUserId(appointment);
  const providerData = buildNotificationData(appointment, "provider");
  const customerData = buildNotificationData(appointment, "customer");

  const payloads = [
    {
      userId: appointment.attendeeId,
      type: "appointment_completed",
      title: "Appointment completed",
      message: `Your appointment for ${customerData.serviceName} has been completed.`,
      data: customerData,
    },
    providerUserId && {
      userId: providerUserId,
      type: "appointment_completed",
      title: "Appointment completed",
      message: "Appointment marked as completed.",
      data: providerData,
    },
  ].filter(Boolean);

  return batchSendNotifications(payloads);
};

const sendAppointmentNoShowNotifications = async (appointment) => {
  if (!appointment) return Promise.resolve(null);
  const providerUserId = await resolveProviderUserId(appointment);
  const providerData = buildNotificationData(appointment, "provider");
  const customerData = buildNotificationData(appointment, "customer");

  const payloads = [
    {
      userId: appointment.attendeeId,
      type: "appointment_no_show",
      title: "No-show recorded",
      message: "Your appointment was marked as no-show.",
      data: customerData,
    },
    providerUserId && {
      userId: providerUserId,
      type: "appointment_no_show",
      title: "No-show recorded",
      message: "Customer did not show up for the appointment.",
      data: providerData,
    },
  ].filter(Boolean);

  return batchSendNotifications(payloads);
};

module.exports = {
  sendAppointmentCreatedNotifications,
  sendAppointmentConfirmedNotification,
  sendAppointmentCancellationNotifications,
  sendAppointmentCompletedNotifications,
  sendAppointmentNoShowNotifications,
};
