const mongoose = require("mongoose");
const Appointment = require("../../models/appointment/appointment.model");
const AppError = require("../../utils/appError");

const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeObjectId = (id) =>
  typeof id === "string" ? id.trim().replace(/^:/, "") : id;

exports.createAppointment = async ({ userId, tenantId, payload }) => {
  try {
    // If tenantId not provided (customer flow), derive it from the shop
    const {
      attendeeId,
      startTimeUTC,
      endTimeUTC,
      mode,
      meeting,
      location,
      currency,
      paymentMethod,
      paymentGateway,
      metadata,
      shopId: rawShopId,
      serviceId: rawServiceId,
    } = payload || {};
    const shopId = normalizeObjectId(rawShopId);
    const serviceId = normalizeObjectId(rawServiceId);
  console.log("REQ PARAMS:", payload.shopId, payload.serviceId);
    const shop = await Shop.findById(shopId).lean();
    console.log("Finding shop with ID:", shopId);
    if (!shop) throw new AppError("Shop not found", 404);
    if (shop.status !== "approved") {
      throw new AppError("Shop not available for booking", 400);
    }
    tenantId = shop.tenantId;

    // Basic checks
    const finalAttendeeId = attendeeId || userId;
    if (!finalAttendeeId) throw new AppError("attendeeId is required", 400);
    if (!startTimeUTC || !endTimeUTC)
      throw new AppError("startTimeUTC and endTimeUTC are required", 400);
    if (!mode) throw new AppError("mode is required", 400);
    if (!shopId) throw new AppError("shopId is required", 400);
    if (!serviceId) throw new AppError("serviceId is required", 400);

    if (!isValidObjectId(shopId)) throw new AppError("Invalid Shop ID", 400);
    if (!isValidObjectId(serviceId))
      throw new AppError("Invalid Service ID", 400);

    // Validate service and derive price
    const service = await Service.findById(serviceId);
    if (!service) {
      console.debug(`Appointment.create: service ${serviceId} not found`);
      throw new AppError("Selected service not found", 404);
    }
    if (!service.isActive) {
      console.debug(`Appointment.create: service ${serviceId} is inactive`);
      throw new AppError("Selected service is not active", 400);
    }

    if (service.shopId.toString() !== shopId.toString()) {
      throw new AppError("Service does not belong to this shop", 400);
    }

    const price = service.price ?? 0;

    // If offline and location not provided, use only shopId in location
    let finalLocation = location;
    if (mode === "offline") {
      finalLocation = { shopId };
    }

    const doc = await Appointment.create({
      tenantId,
      attendeeId: finalAttendeeId,
      shopId,
      serviceId,
      startTimeUTC: new Date(startTimeUTC),
      endTimeUTC: new Date(endTimeUTC),
      mode,
      meeting,
      location: finalLocation,
      price,
      currency: currency || "INR",
      paymentMethod,
      paymentGateway,
      metadata,
    });

    return doc;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Appointment.createAppointment unexpected error:", error);
    console.error(error.stack);
    throw new AppError(error.message || "Failed to create appointment", 500);
  }
};

exports.getAppointments = async ({ tenantId, attendeeId, filters }) => {
  try {
    const query = {};
    if (tenantId) query.tenantId = tenantId;
    if (attendeeId) query.attendeeId = attendeeId;

    if (filters) {
      if (filters.status) query.status = filters.status;
      if (filters.from) query.startTimeUTC = { $gte: new Date(filters.from) };
      if (filters.to) {
        query.endTimeUTC = query.endTimeUTC || {};
        query.endTimeUTC.$lte = new Date(filters.to);
      }
    }

    return await Appointment.find(query).sort({ startTimeUTC: 1 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch appointments", 500);
  }
};

exports.getAppointmentById = async ({ appointmentId, tenantId }) => {
  try {
    appointmentId = normalizeObjectId(appointmentId);
    if (!appointmentId) throw new AppError("Appointment ID is required", 400);
    if (!isValidObjectId(appointmentId))
      throw new AppError("Invalid Appointment ID", 400);
    const q = { _id: appointmentId };
    if (tenantId) q.tenantId = tenantId;

    const appointment = await Appointment.findOne(q);
    if (!appointment) throw new AppError("Appointment not found", 404);
    return appointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch appointment", 500);
  }
};

exports.updateAppointment = async ({
  appointmentId,
  tenantId,
  updatePayload,
}) => {
  try {
    appointmentId = normalizeObjectId(appointmentId);

    if (!appointmentId)
      throw new AppError("Appointment ID is required", 400);

    if (!isValidObjectId(appointmentId))
      throw new AppError("Invalid Appointment ID", 400);

    const findQ = { _id: appointmentId };
    if (tenantId) findQ.tenantId = tenantId;

    // 1️⃣ Fetch existing appointment
    const appointment = await Appointment.findOne(findQ);
    if (!appointment) throw new AppError("Appointment not found", 404);

    const allowedFields = [
      "startTimeUTC",
      "endTimeUTC",
      "mode",
      "meeting",
      "location",
      "status",
      "paymentStatus",
      "paymentMethod",
      "paymentReference",
      "paidAt",
      "cancellation",
      "metadata",
    ];

    const updates = {};
    allowedFields.forEach((key) => {
      if (updatePayload?.[key] !== undefined) {
        updates[key] = updatePayload[key];
      }
    });

    // Convert dates safely
    if (updates.startTimeUTC)
      updates.startTimeUTC = new Date(updates.startTimeUTC);

    if (updates.endTimeUTC)
      updates.endTimeUTC = new Date(updates.endTimeUTC);

    /* =====================================================
       🔒 STATUS TRANSITION CONTROL (Industry Standard)
    ===================================================== */

    if (updates.status) {
      const allowedTransitions = {
        pending: ["confirmed", "rejected", "cancelled"],
        confirmed: ["cancelled", "cancelled_late", "completed", "no_show"],
        rejected: [],
        cancelled: [],
        cancelled_late: [],
        completed: [],
        no_show: [],
      };

      const currentStatus = appointment.status;
      let nextStatus = updates.status;

      if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
        throw new AppError(
          `Cannot change status from ${currentStatus} to ${nextStatus}`,
          400
        );
      }

      /* ==========================================
         ⏱ Auto-handle Late Cancellation
         Example: 2-hour cancellation window
      ========================================== */

      if (nextStatus === "cancelled" && currentStatus === "confirmed") {
        const now = new Date();
        const startTime = new Date(appointment.startTimeUTC);

        const hoursBeforeStart =
          (startTime - now) / (1000 * 60 * 60);

        const CANCELLATION_WINDOW_HOURS = 2;

        if (hoursBeforeStart < CANCELLATION_WINDOW_HOURS) {
          nextStatus = "cancelled_late";
        }
      }

      updates.status = nextStatus;
    }

    /* =====================================================
       📍 Offline location handling
    ===================================================== */

    if (updates.mode === "offline" && !updates.location) {
      updates.location = { shopId: appointment.shopId };
    }

    // 2️⃣ Apply updates safely
    Object.assign(appointment, updates);

    // 3️⃣ Save document (runs validators & hooks)
    await appointment.save();

    return appointment;
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error("Update Appointment Error:", error);
    throw new AppError(
      error.message || "Failed to update appointment",
      500
    );
  }
};

exports.deleteAppointment = async ({ appointmentId, tenantId }) => {
  try {
    appointmentId = normalizeObjectId(appointmentId);
    if (!appointmentId) throw new AppError("Appointment ID is required", 400);
    if (!isValidObjectId(appointmentId))
      throw new AppError("Invalid Appointment ID", 400);
    const q = { _id: appointmentId };
    if (tenantId) q.tenantId = tenantId;

    const appointment = await Appointment.findOneAndDelete(q);
    if (!appointment) throw new AppError("Appointment not found", 404);
    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to delete appointment", 500);
  }
};
