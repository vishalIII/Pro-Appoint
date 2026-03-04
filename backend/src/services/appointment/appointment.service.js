const mongoose = require("mongoose");
const Appointment = require("../../models/appointment/appointment.model");
const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");
const Resource = require("../../models/resource/resource.model");
const AppError = require("../../utils/appError");

const BLOCKING_STATUSES = ["pending", "confirmed"];
const DEFAULT_PAYMENT_HOLD_MINUTES = 10;
const DEFAULT_NO_SHOW_GRACE_MINUTES = 15;
const DEFAULT_LATE_CANCELLATION_WINDOW_HOURS = 2;
const DEFAULT_CUSTOMER_REFUND_WINDOW_HOURS = 24;

const readNonNegativeIntFromEnv = (key, fallback) => {
  const raw = process.env[key];
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const PAYMENT_HOLD_MINUTES = readNonNegativeIntFromEnv(
  "PAYMENT_HOLD_MINUTES",
  DEFAULT_PAYMENT_HOLD_MINUTES,
);
const NO_SHOW_GRACE_MINUTES = readNonNegativeIntFromEnv(
  "NO_SHOW_GRACE_MINUTES",
  DEFAULT_NO_SHOW_GRACE_MINUTES,
);
const LATE_CANCELLATION_WINDOW_HOURS = readNonNegativeIntFromEnv(
  "LATE_CANCELLATION_WINDOW_HOURS",
  DEFAULT_LATE_CANCELLATION_WINDOW_HOURS,
);
const CUSTOMER_REFUND_WINDOW_HOURS = readNonNegativeIntFromEnv(
  "CUSTOMER_REFUND_WINDOW_HOURS",
  DEFAULT_CUSTOMER_REFUND_WINDOW_HOURS,
);

const HUMAN_RESOURCE_TYPE_CANONICAL_MAP = {
  instructor: "staff",
};

const RESOURCE_TYPE_ALIASES = {
  staff: ["staff", "instructor"],
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeObjectId = (id) =>
  typeof id === "string" ? id.trim().replace(/^:/, "") : id;
const normalizeResourceType = (type) => {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : "";
  return HUMAN_RESOURCE_TYPE_CANONICAL_MAP[normalized] || normalized;
};
const getResourceTypeAliases = (normalizedType) =>
  RESOURCE_TYPE_ALIASES[normalizedType] || [normalizedType];

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

const isSameUtcDate = (left, right) =>
  left.getUTCFullYear() === right.getUTCFullYear() &&
  left.getUTCMonth() === right.getUTCMonth() &&
  left.getUTCDate() === right.getUTCDate();

const getDayAvailability = (weeklyAvailability, dayName) =>
  (weeklyAvailability || []).find(
    (entry) =>
      typeof entry?.day === "string" &&
      entry.day.toLowerCase() === dayName,
  );

const isDayOpen = (dayAvailability) => {
  if (!dayAvailability) return false;
  if (typeof dayAvailability.isOpen === "boolean") {
    return dayAvailability.isOpen;
  }
  if (typeof dayAvailability.isAvailable === "boolean") {
    return dayAvailability.isAvailable;
  }
  return false;
};

const getDayRangesOnDateUTC = ({ date, dayAvailability }) => {
  if (!dayAvailability) return [];

  const ranges = [];

  const slotList = Array.isArray(dayAvailability.slots)
    ? dayAvailability.slots
    : [];

  for (const slot of slotList) {
    const startCandidate = slot?.startTime ?? slot?.start;
    const endCandidate = slot?.endTime ?? slot?.end;
    const slotStart = parseTimeOnDateUTC(date, startCandidate);
    const slotEnd = parseTimeOnDateUTC(date, endCandidate);

    if (!slotStart || !slotEnd || slotStart >= slotEnd) {
      continue;
    }

    ranges.push({
      start: slotStart,
      end: slotEnd,
    });
  }

  if (ranges.length > 0) {
    ranges.sort((left, right) => left.start.getTime() - right.start.getTime());
    return ranges;
  }

  // Backward compatibility for previously stored single-window records.
  const rangeStartText =
    typeof dayAvailability.openTime === "string"
      ? dayAvailability.openTime
      : dayAvailability.startTime;
  const rangeEndText =
    typeof dayAvailability.closeTime === "string"
      ? dayAvailability.closeTime
      : dayAvailability.endTime;

  if (rangeStartText && rangeEndText) {
    const rangeStart = parseTimeOnDateUTC(date, rangeStartText);
    const rangeEnd = parseTimeOnDateUTC(date, rangeEndText);
    if (rangeStart && rangeEnd && rangeStart < rangeEnd) {
      return [
        {
          start: rangeStart,
          end: rangeEnd,
        },
      ];
    }
  }

  return ranges;
};

const isWithinAnyRange = ({ startTimeUTC, endTimeUTC, ranges }) =>
  ranges.some(
    (range) =>
      startTimeUTC >= range.start &&
      endTimeUTC <= range.end,
  );

const getIntersectedRanges = (rangesA, rangesB) => {
  const result = [];

  for (const left of rangesA) {
    for (const right of rangesB) {
      const start = left.start > right.start ? left.start : right.start;
      const end = left.end < right.end ? left.end : right.end;

      if (start < end) {
        result.push({ start, end });
      }
    }
  }

  return result;
};

const getBookingAvailabilityError = ({
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
  const isShopClosedByPeriod = isClosedForDateRange({
    dayStart,
    dayEnd,
    closedPeriods: shop.closedPeriods,
  });

  if (isShopClosedByPeriod) {
    return "Shop is closed on selected day.";
  }

  if (!isSameUtcDate(startTimeUTC, endTimeUTC)) {
    return "Booking time is outside shop working hours.";
  }

  const dayName = getDayNameUTC(startTimeUTC);
  const shopDayAvailability = getDayAvailability(
    shop.weeklyAvailability,
    dayName,
  );

  if (!isDayOpen(shopDayAvailability)) {
    return "Shop is closed on selected day.";
  }

  const shopRanges = getDayRangesOnDateUTC({
    date: startTimeUTC,
    dayAvailability: shopDayAvailability,
  });

  if (
    shopRanges.length === 0 ||
    !isWithinAnyRange({
      startTimeUTC,
      endTimeUTC,
      ranges: shopRanges,
    })
  ) {
    return "Booking time is outside shop working hours.";
  }

  const isServiceClosedByPeriod = isClosedForDateRange({
    dayStart,
    dayEnd,
    closedPeriods: service.closedPeriods,
  });

  if (isServiceClosedByPeriod) {
    return "Service is not available at selected time.";
  }

  const serviceDayAvailability = getDayAvailability(
    service.weeklyAvailability,
    dayName,
  );

  if (!isDayOpen(serviceDayAvailability)) {
    return "Service is not available at selected time.";
  }

  const serviceRanges = getDayRangesOnDateUTC({
    date: startTimeUTC,
    dayAvailability: serviceDayAvailability,
  });

  if (
    serviceRanges.length === 0 ||
    !isWithinAnyRange({
      startTimeUTC,
      endTimeUTC,
      ranges: serviceRanges,
    })
  ) {
    return "Service is not available at selected time.";
  }

  return null;
};

const normalizeRequiredResources = (requiredResources) => {
  if (!Array.isArray(requiredResources) || requiredResources.length === 0) {
    throw new AppError("Service requiredResources is missing", 400);
  }

  const aggregated = new Map();

  for (const item of requiredResources) {
    const type = normalizeResourceType(item?.type);
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

const normalizeServiceCapacity = (capacity) => {
  const parsed = Number(capacity);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

const getPerBookingRequiredResources = ({
  requiredResources,
  serviceCapacity,
}) =>
  requiredResources.map((required) => ({
    type: required.type,
    // For multi-capacity services, convert full-session quantity to per-booking units.
    quantity: Math.max(
      1,
      Math.ceil(required.quantity / serviceCapacity),
    ),
  }));

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
  const serviceCapacity = normalizeServiceCapacity(service.capacity);
  const perBookingRequiredResources = getPerBookingRequiredResources({
    requiredResources,
    serviceCapacity,
  });

  return {
    shop,
    service,
    requiredResources: perBookingRequiredResources,
    serviceCapacity,
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
      const typeAliases = getResourceTypeAliases(required.type);
      const resources = await Resource.find({
        shopId,
        type:
          typeAliases.length === 1
            ? typeAliases[0]
            : { $in: typeAliases },
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

const normalizeResourceUnits = (units) => {
  const parsed = Number(units);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

const parseAllocatedResourceEntries = (allocatedResources) => {
  if (!Array.isArray(allocatedResources)) {
    return [];
  }

  const entries = [];

  for (const item of allocatedResources) {
    if (item === null || item === undefined) {
      continue;
    }

    // Backward compatibility: old shape was repeated resource ObjectIds.
    const isPrimitiveResourceId =
      typeof item === "string" ||
      item instanceof mongoose.Types.ObjectId ||
      item?._bsontype === "ObjectId";

    if (isPrimitiveResourceId) {
      entries.push({
        resourceId: String(item),
        units: 1,
      });
      continue;
    }

    if (typeof item === "object" && item.resourceId) {
      entries.push({
        resourceId: String(item.resourceId),
        units: normalizeResourceUnits(item.units),
      });
    }
  }

  return entries;
};

const buildResourceUnitUsageMap = (appointments) => {
  const usage = new Map();

  for (const appointment of appointments || []) {
    const allocatedEntries = parseAllocatedResourceEntries(
      appointment.allocatedResources,
    );

    for (const allocated of allocatedEntries) {
      const key = allocated.resourceId;
      usage.set(key, (usage.get(key) || 0) + allocated.units);
    }
  }

  return usage;
};

const getAllocatedUnitsByResource = (allocatedResources) => {
  const counts = new Map();

  for (const entry of parseAllocatedResourceEntries(allocatedResources)) {
    const key = entry.resourceId;
    counts.set(key, (counts.get(key) || 0) + entry.units);
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
  const selectedAllocations = [];

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
    if (take > 0) {
      selectedAllocations.push({
        resourceId: entry.resource._id,
        units: take,
      });
    }
    remaining -= take;
  }

  return {
    selectedAllocations,
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
    $or: [
      { "allocatedResources.resourceId": { $in: resourceIds } },
      // Backward compatibility for legacy array<ObjectId> documents.
      { allocatedResources: { $in: resourceIds } },
    ],
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

const findAttendeeOverlappingAppointments = async ({
  attendeeId,
  startTimeUTC,
  endTimeUTC,
  session,
  excludeAppointmentId,
  now,
}) => {
  if (!attendeeId) {
    return [];
  }

  const query = {
    attendeeId,
    startTimeUTC: { $lt: endTimeUTC },
    endTimeUTC: { $gt: startTimeUTC },
    ...getActiveConflictFilter(now),
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  return Appointment.find(query)
    .select("_id serviceId startTimeUTC endTimeUTC status expiresAt")
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

  const selectedAllocations = [];
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
        selectedAllocations: [],
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
        selectedAllocations: [],
      };
    }

    selectedAllocations.push(...picked.selectedAllocations);
  }

  return {
    isAvailable: true,
    freeCountsByType,
    selectedAllocations,
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
  const requiredUnitsByResource =
    getAllocatedUnitsByResource(allocatedResources);
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
    const dayName = getDayNameUTC(selectedDate);

    const shopDayAvailability = getDayAvailability(
      shop.weeklyAvailability,
      dayName,
    );
    const serviceDayAvailability = getDayAvailability(
      service.weeklyAvailability,
      dayName,
    );

    if (
      isClosedForDateRange({
        dayStart,
        dayEnd,
        closedPeriods: shop.closedPeriods,
      }) ||
      !isDayOpen(shopDayAvailability) ||
      isClosedForDateRange({
        dayStart,
        dayEnd,
        closedPeriods: service.closedPeriods,
      }) ||
      !isDayOpen(serviceDayAvailability)
    ) {
      return {
        date,
        durationMinutes: service.durationMinutes,
        requiredResources,
        slots: [],
      };
    }

    const shopRanges = getDayRangesOnDateUTC({
      date: selectedDate,
      dayAvailability: shopDayAvailability,
    });
    const serviceRanges = getDayRangesOnDateUTC({
      date: selectedDate,
      dayAvailability: serviceDayAvailability,
    });
    const effectiveRanges = getIntersectedRanges(shopRanges, serviceRanges);

    if (
      shopRanges.length === 0 ||
      serviceRanges.length === 0 ||
      effectiveRanges.length === 0
    ) {
      return {
        date,
        durationMinutes: service.durationMinutes,
        requiredResources,
        slots: [],
      };
    }

    const candidateSlots = [];

    for (const range of effectiveRanges) {
      let cursor = new Date(range.start);

      while (addMinutes(cursor, service.durationMinutes) <= range.end) {
        candidateSlots.push({
          startTimeUTC: new Date(cursor),
          endTimeUTC: addMinutes(cursor, service.durationMinutes),
        });

        cursor = addMinutes(cursor, interval);
      }
    }

    candidateSlots.sort((left, right) =>
      left.startTimeUTC.getTime() - right.startTimeUTC.getTime(),
    );

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

      const availabilityError = getBookingAvailabilityError({
        shop,
        service,
        startTimeUTC: requestedStart,
        endTimeUTC: computedEnd,
      });

      if (availabilityError) {
        throw new AppError(availabilityError, 400);
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

      const attendeeConflicts = await findAttendeeOverlappingAppointments({
        attendeeId: finalAttendeeId,
        startTimeUTC: requestedStart,
        endTimeUTC: computedEnd,
        session,
        now,
      });

      const hasExactDuplicate = attendeeConflicts.some((conflict) => {
        return (
          String(conflict.serviceId) === String(service._id) &&
          new Date(conflict.startTimeUTC).getTime() === requestedStart.getTime() &&
          new Date(conflict.endTimeUTC).getTime() === computedEnd.getTime()
        );
      });

      if (hasExactDuplicate) {
        throw new AppError("Time slot already booked.", 409);
      }

      if (attendeeConflicts.length > 0) {
        throw new AppError("Time slot already booked.", 409);
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
        throw new AppError("Time slot already booked.", 409);
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
            allocatedResources: allocation.selectedAllocations,
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
  tenantId,
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

      if (tenantId && String(appointment.tenantId) !== String(tenantId)) {
        throw new AppError("Unauthorized access to this appointment", 403);
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

      const attendeeConflicts = await findAttendeeOverlappingAppointments({
        attendeeId: appointment.attendeeId,
        startTimeUTC: appointment.startTimeUTC,
        endTimeUTC: appointment.endTimeUTC,
        excludeAppointmentId: appointment._id,
        session,
        now,
      });

      if (attendeeConflicts.length > 0) {
        appointment.status = "cancelled";
        appointment.paymentStatus = "failed";
        appointment.expiresAt = now;
        await appointment.save({ session });

        updatedAppointment = appointment;
        paymentConflict = true;
        conflictReason = "Attendee already has another appointment at this time";
        return;
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
      "completedAt",
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
    if (updates.completedAt) {
      updates.completedAt = new Date(updates.completedAt);
      if (Number.isNaN(updates.completedAt.getTime())) {
        throw new AppError("Invalid completedAt", 400);
      }
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

        if (hoursBeforeStart < LATE_CANCELLATION_WINDOW_HOURS) {
          nextStatus = "cancelled_late";
        }
      }

      if (nextStatus === "completed") {
        const now = new Date();
        const appointmentEnd = new Date(
          updates.endTimeUTC || appointment.endTimeUTC,
        );
        const effectivePaymentStatus =
          updates.paymentStatus || appointment.paymentStatus;

        if (now < appointmentEnd) {
          throw new AppError(
            "Cannot complete appointment before its end time",
            400,
          );
        }

        if (effectivePaymentStatus !== "paid") {
          throw new AppError(
            "Cannot complete appointment before payment is paid",
            400,
          );
        }

        updates.completedAt = updates.completedAt || now;
      }

      updates.status = nextStatus;
    }

    if (updates.mode === "offline" && !updates.location) {
      updates.location = { shopId: appointment.shopId };
    }

    const nextStart = updates.startTimeUTC || appointment.startTimeUTC;
    const nextEnd = updates.endTimeUTC || appointment.endTimeUTC;

    if (updates.startTimeUTC || updates.endTimeUTC) {
      if (nextStart >= nextEnd) {
        throw new AppError("endTimeUTC must be after startTimeUTC", 400);
      }

      const [shop, service] = await Promise.all([
        Shop.findById(appointment.shopId),
        Service.findById(appointment.serviceId),
      ]);

      if (!shop || !service) {
        throw new AppError("Shop or service not found for appointment", 404);
      }

      const availabilityError = getBookingAvailabilityError({
        shop,
        service,
        startTimeUTC: nextStart,
        endTimeUTC: nextEnd,
      });

      if (availabilityError) {
        throw new AppError(availabilityError, 400);
      }
    }

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
        throw new AppError("Time slot already booked.", 409);
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

exports.markAppointmentNoShow = async ({
  appointmentId: rawAppointmentId,
  tenantId,
  markedByUserId,
}) => {
  try {
    const appointmentId = normalizeObjectId(rawAppointmentId);

    if (!appointmentId || !isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new AppError("Invalid tenant ID", 400);
    }

    if (!markedByUserId || !isValidObjectId(markedByUserId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      tenantId,
    });

    if (!appointment) {
      throw new AppError("Appointment not found", 404);
    }

    if (appointment.status !== "confirmed") {
      throw new AppError(
        `Cannot mark no-show for appointment with status ${appointment.status}`,
        400,
      );
    }

    const now = new Date();
    const noShowEligibleAt = addMinutes(
      new Date(appointment.startTimeUTC),
      NO_SHOW_GRACE_MINUTES,
    );

    if (now < noShowEligibleAt) {
      throw new AppError(
        `No-show can be marked only after ${NO_SHOW_GRACE_MINUTES} minutes from appointments start time`,
        400,
      );
    }

    appointment.status = "no_show";
    appointment.noShowMarkedBy = markedByUserId;
    appointment.noShowMarkedAt = now;

    await appointment.save();
    return appointment;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to mark appointment no-show", 500);
  }
};

exports.cancelAppointment = async ({
  appointmentId: rawAppointmentId,
  actorType,
  actorUserId,
  actorTenantId,
  reason,
}) => {
  try {
    const appointmentId = normalizeObjectId(rawAppointmentId);

    if (!appointmentId || !isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }

    if (!["customer", "tenant"].includes(actorType)) {
      throw new AppError("Invalid cancellation actor", 400);
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new AppError("Appointment not found", 404);
    }

    if (actorType === "customer") {
      if (!actorUserId) {
        throw new AppError("Unauthorized", 401);
      }
      if (String(appointment.attendeeId) !== String(actorUserId)) {
        throw new AppError("Unauthorized access to this appointment", 403);
      }
    }

    if (actorType === "tenant") {
      if (!actorTenantId) {
        throw new AppError("Unauthorized", 401);
      }
      if (String(appointment.tenantId) !== String(actorTenantId)) {
        throw new AppError("Unauthorized access to this appointment", 403);
      }
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      throw new AppError(
        `Cannot cancel appointment with status ${appointment.status}`,
        400,
      );
    }

    const now = new Date();
    const hoursBeforeStart =
      (new Date(appointment.startTimeUTC) - now) / (1000 * 60 * 60);

    const customerRefundEligible =
      hoursBeforeStart >= CUSTOMER_REFUND_WINDOW_HOURS;
    const refundEligible =
      actorType === "tenant" || customerRefundEligible;

    if (
      actorType === "customer" &&
      !customerRefundEligible &&
      appointment.status === "confirmed"
    ) {
      appointment.status = "cancelled_late";
    } else {
      appointment.status = "cancelled";
    }

    appointment.cancellation = {
      cancelledBy: actorUserId || appointment.cancellation?.cancelledBy,
      cancelledAt: now,
      reason:
        reason ||
        (actorType === "tenant"
          ? "Cancelled by service provider"
          : "Cancelled by customer"),
    };

    if (appointment.paymentStatus === "paid") {
      if (refundEligible) {
        appointment.paymentStatus = "refunded";
        appointment.refund = {
          amount: appointment.price || 0,
          refundedAt: now,
          reason:
            actorType === "tenant"
              ? "Tenant cancelled appointment"
              : `Customer cancelled at least ${CUSTOMER_REFUND_WINDOW_HOURS} hours before start`,
        };
      } else {
        appointment.refund = {
          amount: 0,
          refundedAt: appointment.refund?.refundedAt,
          reason:
            `No refund: customer cancelled less than ${CUSTOMER_REFUND_WINDOW_HOURS} hours before start`,
        };
      }
    } else if (
      ["pending", "unpaid"].includes(appointment.paymentStatus)
    ) {
      appointment.paymentStatus = "failed";
      appointment.expiresAt = now;
    }

    await appointment.save();

    return {
      appointment,
      refundEligible,
      refundPolicy: refundEligible
        ? "Refund eligible"
        : `No refund (customer cancelled within ${CUSTOMER_REFUND_WINDOW_HOURS} hours)`,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to cancel appointment", 500);
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
