const mongoose = require("mongoose");
const Appointment = require("../../models/appointment/appointment.model");
const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const Resource = require("../../models/resource/resource.model");
const AppError = require("../../utils/appError");

const PAYMENT_HOLD_MINUTES = 10;
const BLOCKING_STATUSES = ["pending", "confirmed"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeObjectId = (id) =>
  typeof id === "string" ? id.trim().replace(/^:/, "") : id;

const addMinutes = (value, minutes) =>
  new Date(value.getTime() + minutes * 60 * 1000);

const toDate = (value, fieldName) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return date;
};

const parseDateOnlyUTC = (value) => {
  if (!value || typeof value !== "string") {
    throw new AppError("date query param is required (YYYY-MM-DD)", 400);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid date format. Use YYYY-MM-DD", 400);
  }
  return date;
};

const parseTimeOnDateUTC = (date, timeText) => {
  const match =
    typeof timeText === "string"
      ? timeText.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
      : null;

  if (!match) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(match[1]),
      Number(match[2]),
      0,
      0,
    ),
  );
};

const getDayNameUTC = (date) => {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayNames[date.getUTCDay()];
};

const isOverlapping = ({
  startA,
  endA,
  startB,
  endB,
}) => startA < endB && endA > startB;

const isClosedForDateRange = ({ dayStart, dayEnd, closedPeriods }) => {
  if (!Array.isArray(closedPeriods) || closedPeriods.length === 0) {
    return false;
  }

  return closedPeriods.some((period) => {
    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime())
    ) {
      return false;
    }

    return isOverlapping({
      startA: dayStart,
      endA: dayEnd,
      startB: periodStart,
      endB: periodEnd,
    });
  });
};

const isInsideServiceAndShopAvailability = ({
  shop,
  service,
  startTimeUTC,
  endTimeUTC,
}) => {
  const dayStart = new Date(
    Date.UTC(
      startTimeUTC.getUTCFullYear(),
      startTimeUTC.getUTCMonth(),
      startTimeUTC.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const dayEnd = addMinutes(dayStart, 24 * 60);

  if (
    isClosedForDateRange({
      dayStart,
      dayEnd,
      closedPeriods: shop.closedPeriods,
    }) ||
    isClosedForDateRange({
      dayStart,
      dayEnd,
      closedPeriods: service.closedPeriods,
    })
  ) {
    return false;
  }

  const dayName = getDayNameUTC(startTimeUTC);
  const dayAvailability = (service.weeklyAvailability || []).find(
    (entry) => entry.day === dayName,
  );

  if (
    !dayAvailability ||
    !dayAvailability.isOpen ||
    !Array.isArray(dayAvailability.slots)
  ) {
    return false;
  }

  return dayAvailability.slots.some((windowSlot) => {
    const windowStart = parseTimeOnDateUTC(startTimeUTC, windowSlot.start);
    const windowEnd = parseTimeOnDateUTC(startTimeUTC, windowSlot.end);

    if (!windowStart || !windowEnd || windowStart >= windowEnd) {
      return false;
    }

    return startTimeUTC >= windowStart && endTimeUTC <= windowEnd;
  });
};

const normalizeRequiredResources = (requiredResources) => {
  if (!Array.isArray(requiredResources) || requiredResources.length === 0) {
    throw new AppError("Service requiredResources is missing", 400);
  }

  const aggregated = new Map();

  for (const item of requiredResources) {
    const type =
      typeof item?.type === "string" ? item.type.trim().toLowerCase() : "";
    const quantity = Number(item?.quantity);

    if (!type) {
      throw new AppError("Service has invalid required resource type", 400);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        `Service has invalid required resource quantity for type ${type}`,
        400,
      );
    }

    aggregated.set(type, (aggregated.get(type) || 0) + quantity);
  }

  return [...aggregated.entries()].map(([type, quantity]) => ({
    type,
    quantity,
  }));
};

const getActiveConflictFilter = (now) => ({
  status: { $in: BLOCKING_STATUSES },
  $or: [
    { status: "confirmed" },
    { status: "pending", expiresAt: { $gt: now } },
    { status: "pending", expiresAt: { $exists: false } },
  ],
});

const ensureBookableShopAndService = async ({
  shopId,
  serviceId,
  session,
}) => {
  if (!shopId) throw new AppError("shopId is required", 400);
  if (!serviceId) throw new AppError("serviceId is required", 400);

  if (!isValidObjectId(shopId)) throw new AppError("Invalid Shop ID", 400);
  if (!isValidObjectId(serviceId)) {
    throw new AppError("Invalid Service ID", 400);
  }

  const shop = await Shop.findById(shopId).session(session);
  if (!shop) throw new AppError("Shop not found", 404);
  if (shop.status !== "approved") {
    throw new AppError("Shop not available for booking", 400);
  }

  const service = await Service.findById(serviceId).session(session);
  if (!service) {
    throw new AppError("Selected service not found", 404);
  }
  if (!service.isActive) {
    throw new AppError("Selected service is not active", 400);
  }

  if (service.shopId.toString() !== shopId.toString()) {
    throw new AppError("Service does not belong to this shop", 400);
  }

  if (
    !Number.isInteger(service.durationMinutes) ||
    service.durationMinutes <= 0
  ) {
    throw new AppError("Selected service has invalid durationMinutes", 400);
  }

  const requiredResources = normalizeRequiredResources(
    service.requiredResources,
  );

  return {
    shop,
    service,
    requiredResources,
  };
};

const getResourcesByType = async ({
  shopId,
  tenantId,
  requiredResources,
  session,
}) => {
  const entries = await Promise.all(
    requiredResources.map(async (required) => {
      const resources = await Resource.find({
        shopId,
        type: required.type,
        isActive: true,
      })
        .sort({ _id: 1 })
        .select("_id type name capacity")
        .session(session)
        .lean();

      return [required.type, resources];
    }),
  );

  return new Map(entries);
};

const normalizeResourceCapacity = (resource) => {
  const capacity = Number(resource?.capacity);
  if (!Number.isFinite(capacity) || capacity < 1) {
    return 1;
  }
  return Math.floor(capacity);
};

const buildResourceUnitUsageMap = (appointments) => {
  const usage = new Map();

  for (const appointment of appointments || []) {
    for (const resourceId of appointment.allocatedResources || []) {
      const key = String(resourceId);
      usage.set(key, (usage.get(key) || 0) + 1);
    }
  }

  return usage;
};

const getResourceIdCounts = (resourceIds) => {
  const counts = new Map();

  for (const resourceId of resourceIds || []) {
    const key = String(resourceId);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
};

const getTotalFreeUnitsForType = ({
  resources,
  usedUnitsByResource,
}) => {
  let totalFreeUnits = 0;

  for (const resource of resources || []) {
    const key = String(resource._id);
    const usedUnits = usedUnitsByResource.get(key) || 0;
    const freeUnits = Math.max(
      0,
      normalizeResourceCapacity(resource) - usedUnits,
    );
    totalFreeUnits += freeUnits;
  }

  return totalFreeUnits;
};

const pickResourceUnits = ({
  resources,
  requiredQuantity,
  usedUnitsByResource,
}) => {
  let remaining = requiredQuantity;
  const selectedResourceIds = [];

  const resourcesWithFreeUnits = (resources || [])
    .map((resource) => {
      const key = String(resource._id);
      const usedUnits = usedUnitsByResource.get(key) || 0;
      const freeUnits = Math.max(
        0,
        normalizeResourceCapacity(resource) - usedUnits,
      );

      return { resource, freeUnits };
    })
    .filter((entry) => entry.freeUnits > 0)
    .sort((a, b) => b.freeUnits - a.freeUnits);

  for (const entry of resourcesWithFreeUnits) {
    if (remaining <= 0) break;

    const take = Math.min(remaining, entry.freeUnits);
    for (let i = 0; i < take; i += 1) {
      selectedResourceIds.push(entry.resource._id);
    }
    remaining -= take;
  }

  return {
    selectedResourceIds,
    fulfilled: remaining === 0,
  };
};

const findBlockingAppointments = async ({
  shopId,
  resourceIds,
  startTimeUTC,
  endTimeUTC,
  session,
  excludeAppointmentId,
  now,
}) => {
  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    return [];
  }

  const query = {
    shopId,
    allocatedResources: { $in: resourceIds },
    startTimeUTC: { $lt: endTimeUTC },
    endTimeUTC: { $gt: startTimeUTC },
    ...getActiveConflictFilter(now),
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  return Appointment.find(query)
    .select("allocatedResources startTimeUTC endTimeUTC status expiresAt")
    .session(session)
    .lean();
};

const getFreeResourcesForWindow = async ({
  shopId,
  requiredResources,
  resourcesByType,
  startTimeUTC,
  endTimeUTC,
  session,
  now,
  excludeAppointmentId,
}) => {
  const allResourceIds = [];
  for (const required of requiredResources) {
    const resources = resourcesByType.get(required.type) || [];
    for (const resource of resources) {
      allResourceIds.push(resource._id);
    }
  }

  const conflicts = await findBlockingAppointments({
    shopId,
    resourceIds: allResourceIds,
    startTimeUTC,
    endTimeUTC,
    session,
    excludeAppointmentId,
    now,
  });

  const usedUnitsByResource = buildResourceUnitUsageMap(conflicts);

  const selectedResourceIds = [];
  const freeCountsByType = {};

  for (const required of requiredResources) {
    const resources = resourcesByType.get(required.type) || [];

    const totalFreeUnits = getTotalFreeUnitsForType({
      resources,
      usedUnitsByResource,
    });
    freeCountsByType[required.type] = totalFreeUnits;

    if (totalFreeUnits < required.quantity) {
      return {
        isAvailable: false,
        freeCountsByType,
        selectedResourceIds: [],
      };
    }

    const picked = pickResourceUnits({
      resources,
      requiredQuantity: required.quantity,
      usedUnitsByResource,
    });

    if (!picked.fulfilled) {
      return {
        isAvailable: false,
        freeCountsByType,
        selectedResourceIds: [],
      };
    }

    selectedResourceIds.push(...picked.selectedResourceIds);
  }

  return {
    isAvailable: true,
    freeCountsByType,
    selectedResourceIds,
  };
};

const hasCapacityConflictForAllocatedResources = async ({
  shopId,
  allocatedResources,
  startTimeUTC,
  endTimeUTC,
  excludeAppointmentId,
  session,
  now,
}) => {
  const requiredUnitsByResource = getResourceIdCounts(allocatedResources);
  const resourceIds = [...requiredUnitsByResource.keys()];
  if (resourceIds.length === 0) return true;

  const resources = await Resource.find({
    _id: { $in: resourceIds },
    shopId,
  })
    .select("_id capacity")
    .session(session)
    .lean();

  const capacityByResource = new Map(
    resources.map((resource) => [
      String(resource._id),
      normalizeResourceCapacity(resource),
    ]),
  );

  for (const resourceId of resourceIds) {
    if (!capacityByResource.has(resourceId)) {
      return true;
    }
  }

  const conflicts = await findBlockingAppointments({
    shopId,
    resourceIds,
    startTimeUTC,
    endTimeUTC,
    excludeAppointmentId,
    session,
    now,
  });

  const usedUnitsByResource = buildResourceUnitUsageMap(conflicts);

  for (const [resourceId, requiredUnits] of requiredUnitsByResource.entries()) {
    const capacity = capacityByResource.get(resourceId) || 0;
    const usedUnits = usedUnitsByResource.get(resourceId) || 0;

    if (usedUnits + requiredUnits > capacity) {
      return true;
    }
  }

  return false;
};

exports.getAvailableSlots = async ({
  shopId: rawShopId,
  serviceId: rawServiceId,
  date,
  slotIntervalMinutes,
}) => {
  try {
    const shopId = normalizeObjectId(rawShopId);
    const serviceId = normalizeObjectId(rawServiceId);
    const selectedDate = parseDateOnlyUTC(date);

    const intervalRaw =
      slotIntervalMinutes === undefined ? 15 : Number(slotIntervalMinutes);
    const interval = Number.isInteger(intervalRaw) ? intervalRaw : 15;
    if (interval <= 0 || interval > 240) {
      throw new AppError(
        "slotIntervalMinutes must be an integer between 1 and 240",
        400,
      );
    }

    const { shop, service, requiredResources } =
      await ensureBookableShopAndService({
        shopId,
        serviceId,
      });

    const dayStart = selectedDate;
    const dayEnd = addMinutes(dayStart, 24 * 60);

    if (
      isClosedForDateRange({
        dayStart,
        dayEnd,
        closedPeriods: shop.closedPeriods,
      }) ||
      isClosedForDateRange({
        dayStart,
        dayEnd,
        closedPeriods: service.closedPeriods,
      })
    ) {
      return {
        date,
        durationMinutes: service.durationMinutes,
        requiredResources,
        slots: [],
      };
    }

    const dayName = getDayNameUTC(selectedDate);
    const dayAvailability = (service.weeklyAvailability || []).find(
      (entry) => entry.day === dayName,
    );

    if (
      !dayAvailability ||
      !dayAvailability.isOpen ||
      !Array.isArray(dayAvailability.slots) ||
      dayAvailability.slots.length === 0
    ) {
      return {
        date,
        durationMinutes: service.durationMinutes,
        requiredResources,
        slots: [],
      };
    }

    const candidateSlots = [];

    for (const windowSlot of dayAvailability.slots) {
      const windowStart = parseTimeOnDateUTC(selectedDate, windowSlot.start);
      const windowEnd = parseTimeOnDateUTC(selectedDate, windowSlot.end);

      if (!windowStart || !windowEnd || windowStart >= windowEnd) {
        continue;
      }

      let cursor = new Date(windowStart);

      while (addMinutes(cursor, service.durationMinutes) <= windowEnd) {
        candidateSlots.push({
          startTimeUTC: new Date(cursor),
          endTimeUTC: addMinutes(cursor, service.durationMinutes),
        });

        cursor = addMinutes(cursor, interval);
      }
    }

    if (candidateSlots.length === 0) {
      return {
        date,
        durationMinutes: service.durationMinutes,
        requiredResources,
        slots: [],
      };
    }

    const resourcesByType = await getResourcesByType({
      shopId: shop._id,
      tenantId: shop.tenantId,
      requiredResources,
    });

    for (const required of requiredResources) {
      const resources = resourcesByType.get(required.type) || [];
      const totalTypeCapacity = resources.reduce(
        (sum, resource) => sum + normalizeResourceCapacity(resource),
        0,
      );

      if (totalTypeCapacity < required.quantity) {
        return {
          date,
          durationMinutes: service.durationMinutes,
          requiredResources,
          slots: [],
        };
      }
    }

    const allResourceIds = [];
    for (const resources of resourcesByType.values()) {
      for (const resource of resources) {
        allResourceIds.push(resource._id);
      }
    }

    const earliest = candidateSlots[0].startTimeUTC;
    const latest = candidateSlots[candidateSlots.length - 1].endTimeUTC;
    const now = new Date();

    const conflicts = await findBlockingAppointments({
      shopId: shop._id,
      resourceIds: allResourceIds,
      startTimeUTC: earliest,
      endTimeUTC: latest,
      now,
    });

    const availableSlots = [];
    const nowForFiltering = new Date();

    for (const candidate of candidateSlots) {
      if (candidate.startTimeUTC <= nowForFiltering) {
        continue;
      }

      const overlappingConflicts = conflicts.filter((conflict) =>
        isOverlapping({
          startA: conflict.startTimeUTC,
          endA: conflict.endTimeUTC,
          startB: candidate.startTimeUTC,
          endB: candidate.endTimeUTC,
        }),
      );
      const usedUnitsByResource = buildResourceUnitUsageMap(
        overlappingConflicts,
      );

      let canAllocate = true;
      const freeResourcesByType = {};

      for (const required of requiredResources) {
        const freeCount = getTotalFreeUnitsForType({
          resources: resourcesByType.get(required.type) || [],
          usedUnitsByResource,
        });

        freeResourcesByType[required.type] = freeCount;

        if (freeCount < required.quantity) {
          canAllocate = false;
          break;
        }
      }

      if (canAllocate) {
        availableSlots.push({
          startTimeUTC: candidate.startTimeUTC,
          endTimeUTC: candidate.endTimeUTC,
          freeResourcesByType,
        });
      }
    }

    return {
      date,
      durationMinutes: service.durationMinutes,
      requiredResources,
      slots: availableSlots,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch available slots", 500);
  }
};

exports.createAppointment = async ({ userId, tenantId, payload }) => {
  const session = await mongoose.startSession();

  try {
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

    const finalAttendeeId = attendeeId || userId;
    if (!finalAttendeeId) {
      throw new AppError("attendeeId is required", 400);
    }

    if (!startTimeUTC) {
      throw new AppError("startTimeUTC is required", 400);
    }

    if (!mode) {
      throw new AppError("mode is required", 400);
    }

    const requestedStart = toDate(startTimeUTC, "startTimeUTC");
    let createdAppointment;

    await session.withTransaction(async () => {
      const { shop, service, requiredResources } =
        await ensureBookableShopAndService({
          shopId,
          serviceId,
          session,
        });

      if (tenantId && String(shop.tenantId) !== String(tenantId)) {
        throw new AppError("Unauthorized tenant access for this shop", 403);
      }

      const computedEnd = addMinutes(
        requestedStart,
        service.durationMinutes,
      );

      const isInsideAvailability = isInsideServiceAndShopAvailability({
        shop,
        service,
        startTimeUTC: requestedStart,
        endTimeUTC: computedEnd,
      });

      if (!isInsideAvailability) {
        throw new AppError(
          "Selected slot is outside service availability",
          400,
        );
      }

      if (endTimeUTC) {
        const requestedEnd = toDate(endTimeUTC, "endTimeUTC");
        if (requestedEnd.getTime() !== computedEnd.getTime()) {
          throw new AppError(
            "endTimeUTC does not match service durationMinutes",
            400,
          );
        }
      }

      const now = new Date();
      if (requestedStart <= now) {
        throw new AppError("Cannot book an appointment in the past", 400);
      }

      const resourcesByType = await getResourcesByType({
        shopId: shop._id,
        tenantId: shop.tenantId,
        requiredResources,
        session,
      });

      const allocation = await getFreeResourcesForWindow({
        shopId: shop._id,
        requiredResources,
        resourcesByType,
        startTimeUTC: requestedStart,
        endTimeUTC: computedEnd,
        session,
        now,
      });

      if (!allocation.isAvailable) {
        throw new AppError("Selected slot is no longer available", 409);
      }

      let finalLocation = location;
      if (mode === "offline") {
        finalLocation = { shopId: shop._id };
      }

      const [doc] = await Appointment.create(
        [
          {
            tenantId: shop.tenantId,
            attendeeId: finalAttendeeId,
            shopId: shop._id,
            serviceId: service._id,
            allocatedResources: allocation.selectedResourceIds,
            startTimeUTC: requestedStart,
            endTimeUTC: computedEnd,
            mode,
            meeting,
            location: finalLocation,
            price: service.price ?? 0,
            currency: currency || "INR",
            paymentMethod,
            paymentGateway,
            paymentStatus: "pending",
            status: "pending",
            metadata,
            expiresAt: addMinutes(now, PAYMENT_HOLD_MINUTES),
          },
        ],
        { session },
      );

      createdAppointment = doc;
    });

    return createdAppointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to create appointment", 500);
  } finally {
    await session.endSession();
  }
};

exports.confirmAppointmentPayment = async ({
  appointmentId: rawAppointmentId,
  paymentReference,
  paymentGateway,
  paymentMethod,
}) => {
  const session = await mongoose.startSession();

  try {
    const appointmentId = normalizeObjectId(rawAppointmentId);

    if (!appointmentId || !isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

    let updatedAppointment = null;
    let paymentConflict = false;
    let conflictReason = null;

    await session.withTransaction(async () => {
      const appointment = await Appointment.findById(appointmentId).session(
        session,
      );

      if (!appointment) {
        throw new AppError("Appointment not found", 404);
      }

      if (
        appointment.status === "confirmed" &&
        appointment.paymentStatus === "paid"
      ) {
        updatedAppointment = appointment;
        return;
      }

      if (!["pending", "confirmed"].includes(appointment.status)) {
        throw new AppError(
          "Appointment is not in a payable state",
          400,
        );
      }

      const now = new Date();

      if (
        appointment.status === "pending" &&
        appointment.expiresAt &&
        appointment.expiresAt <= now
      ) {
        appointment.status = "cancelled";
        appointment.paymentStatus = "failed";
        appointment.expiresAt = now;
        await appointment.save({ session });

        updatedAppointment = appointment;
        paymentConflict = true;
        conflictReason = "Payment window expired for this appointment";
        return;
      }

      if (
        !Array.isArray(appointment.allocatedResources) ||
        appointment.allocatedResources.length === 0
      ) {
        throw new AppError(
          "Appointment has no allocated resources",
          400,
        );
      }

      const hasConflict = await hasCapacityConflictForAllocatedResources({
        shopId: appointment.shopId,
        allocatedResources: appointment.allocatedResources,
        startTimeUTC: appointment.startTimeUTC,
        endTimeUTC: appointment.endTimeUTC,
        excludeAppointmentId: appointment._id,
        session,
        now,
      });

      if (hasConflict) {
        appointment.status = "cancelled";
        appointment.paymentStatus = "failed";
        appointment.expiresAt = now;
        await appointment.save({ session });

        updatedAppointment = appointment;
        paymentConflict = true;
        conflictReason =
          "Resource conflict detected during payment confirmation";
        return;
      }

      appointment.paymentStatus = "paid";
      appointment.status = "confirmed";
      appointment.paidAt = now;
      appointment.expiresAt = undefined;

      if (paymentReference) appointment.paymentReference = paymentReference;
      if (paymentGateway) appointment.paymentGateway = paymentGateway;
      if (paymentMethod) appointment.paymentMethod = paymentMethod;

      await appointment.save({ session });
      updatedAppointment = appointment;
    });

    return {
      appointment: updatedAppointment,
      paymentConflict,
      conflictReason,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to confirm payment", 500);
  } finally {
    await session.endSession();
  }
};

exports.markAppointmentPaymentFailed = async ({
  appointmentId: rawAppointmentId,
  paymentReference,
  paymentGateway,
}) => {
  const session = await mongoose.startSession();

  try {
    const appointmentId = normalizeObjectId(rawAppointmentId);
    if (!appointmentId || !isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

    let updatedAppointment;

    await session.withTransaction(async () => {
      const appointment = await Appointment.findById(appointmentId).session(
        session,
      );

      if (!appointment) {
        throw new AppError("Appointment not found", 404);
      }

      if (appointment.paymentStatus === "paid") {
        updatedAppointment = appointment;
        return;
      }

      appointment.paymentStatus = "failed";
      if (appointment.status === "pending") {
        appointment.status = "cancelled";
      }
      appointment.expiresAt = new Date();

      if (paymentReference) appointment.paymentReference = paymentReference;
      if (paymentGateway) appointment.paymentGateway = paymentGateway;

      await appointment.save({ session });
      updatedAppointment = appointment;
    });

    return updatedAppointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to mark payment as failed", 500);
  } finally {
    await session.endSession();
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
    if (!isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

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

    if (!appointmentId) {
      throw new AppError("Appointment ID is required", 400);
    }

    if (!isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

    const findQ = { _id: appointmentId };
    if (tenantId) findQ.tenantId = tenantId;

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

    if (updates.startTimeUTC) {
      updates.startTimeUTC = new Date(updates.startTimeUTC);
    }
    if (updates.endTimeUTC) {
      updates.endTimeUTC = new Date(updates.endTimeUTC);
    }

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
          400,
        );
      }

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

    if (updates.mode === "offline" && !updates.location) {
      updates.location = { shopId: appointment.shopId };
    }

    const nextStart = updates.startTimeUTC || appointment.startTimeUTC;
    const nextEnd = updates.endTimeUTC || appointment.endTimeUTC;

    if (
      (updates.startTimeUTC || updates.endTimeUTC) &&
      Array.isArray(appointment.allocatedResources) &&
      appointment.allocatedResources.length > 0
    ) {
      const now = new Date();
      const hasConflict = await hasCapacityConflictForAllocatedResources({
        shopId: appointment.shopId,
        allocatedResources: appointment.allocatedResources,
        startTimeUTC: nextStart,
        endTimeUTC: nextEnd,
        excludeAppointmentId: appointment._id,
        now,
      });

      if (hasConflict) {
        throw new AppError(
          "Reschedule failed: allocated resources are already booked for this time",
          409,
        );
      }
    }

    Object.assign(appointment, updates);
    await appointment.save();

    return appointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to update appointment", 500);
  }
};

exports.deleteAppointment = async ({ appointmentId, tenantId }) => {
  try {
    appointmentId = normalizeObjectId(appointmentId);
    if (!appointmentId) throw new AppError("Appointment ID is required", 400);
    if (!isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

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
