const mongoose = require("mongoose");
const Appointment = require("../../models/appointment/appointment.model");
const AppError = require("../../utils/appError");

const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
      shopId,
      serviceId,
    } = payload || {};

    const shop = await Shop.findById(shopId).lean();
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
    if (!appointmentId) throw new AppError("Appointment ID is required", 400);
    if (!isValidObjectId(appointmentId))
      throw new AppError("Invalid Appointment ID", 400);

    const allowed = [
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
    allowed.forEach((k) => {
      if (updatePayload?.[k] !== undefined) updates[k] = updatePayload[k];
    });

    if (updates.startTimeUTC)
      updates.startTimeUTC = new Date(updates.startTimeUTC);
    if (updates.endTimeUTC) updates.endTimeUTC = new Date(updates.endTimeUTC);

    // If switching to offline and location not provided, set location to only shopId
    if (updates.mode === "offline" && !updates.location) {
      // fetch existing appointment to get shopId
      const q = { _id: appointmentId };
      if (tenantId) q.tenantId = tenantId;
      const existing = await Appointment.findOne(q).lean();
      const shopIdToUse = updates.shopId || existing?.shopId;
      if (shopIdToUse) {
        updates.location = { shopId: shopIdToUse };
      }
    }

    const findQ = { _id: appointmentId };
    if (tenantId) findQ.tenantId = tenantId;

    const appointment = await Appointment.findOneAndUpdate(
      findQ,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!appointment) throw new AppError("Appointment not found", 404);
    return appointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to update appointment", 500);
  }
};

exports.deleteAppointment = async ({ appointmentId, tenantId }) => {
  try {
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
