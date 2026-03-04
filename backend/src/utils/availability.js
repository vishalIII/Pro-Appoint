const AppError = require("./appError");

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const TIME_TEXT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeDay = (day) =>
  typeof day === "string" ? day.trim().toLowerCase() : "";

const hasOwn = (value, key) =>
  value && Object.prototype.hasOwnProperty.call(value, key);

const minutesToTimeText = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const parseTimeToMinutes = (value, fieldLabel) => {
  if (typeof value !== "string" || !TIME_TEXT_REGEX.test(value.trim())) {
    throw new AppError(`${fieldLabel} must be in HH:MM format`, 400);
  }

  const [hoursText, minutesText] = value.trim().split(":");
  return Number(hoursText) * 60 + Number(minutesText);
};

const normalizeSlot = ({ slot, day, slotIndex, ownerLabel }) => {
  const startCandidate = slot?.startTime ?? slot?.start;
  const endCandidate = slot?.endTime ?? slot?.end;

  const startMinutes = parseTimeToMinutes(
    startCandidate,
    `${ownerLabel} slot startTime for ${day} (#${slotIndex + 1})`,
  );
  const endMinutes = parseTimeToMinutes(
    endCandidate,
    `${ownerLabel} slot endTime for ${day} (#${slotIndex + 1})`,
  );

  if (startMinutes >= endMinutes) {
    throw new AppError(
      `${ownerLabel} slot startTime must be earlier than endTime for ${day}`,
      400,
    );
  }

  return {
    startTime: minutesToTimeText(startMinutes),
    endTime: minutesToTimeText(endMinutes),
    _startMinutes: startMinutes,
    _endMinutes: endMinutes,
  };
};

const normalizeSlots = ({ slots, day, ownerLabel, allowEmpty }) => {
  if (!Array.isArray(slots)) {
    throw new AppError(`${ownerLabel} slots must be an array for ${day}`, 400);
  }

  if (!allowEmpty && slots.length === 0) {
    throw new AppError(
      `${ownerLabel} open day must contain at least one slot: ${day}`,
      400,
    );
  }

  const normalized = slots.map((slot, slotIndex) =>
    normalizeSlot({ slot, day, slotIndex, ownerLabel }),
  );

  normalized.sort((left, right) => {
    if (left._startMinutes !== right._startMinutes) {
      return left._startMinutes - right._startMinutes;
    }
    return left._endMinutes - right._endMinutes;
  });

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (current._startMinutes < previous._endMinutes) {
      throw new AppError(`${ownerLabel} slots overlap on ${day}`, 400);
    }
  }

  return normalized.map((slot) => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
};

const assertCompleteWeek = (weeklyAvailability) => {
  if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length !== 7) {
    throw new AppError("All 7 days availability required", 400);
  }

  const normalizedDays = weeklyAvailability.map((entry) =>
    normalizeDay(entry?.day),
  );

  if (new Set(normalizedDays).size !== 7) {
    throw new AppError("Duplicate or missing days in weekly availability", 400);
  }

  for (const day of normalizedDays) {
    if (!VALID_DAYS.includes(day)) {
      throw new AppError(`Invalid day provided: ${day}`, 400);
    }
  }
};

const validateShopWeeklyAvailability = (weeklyAvailability) => {
  assertCompleteWeek(weeklyAvailability);

  const entriesByDay = new Map();

  for (const entry of weeklyAvailability) {
    const day = normalizeDay(entry?.day);

    if (!hasOwn(entry, "isOpen") || typeof entry.isOpen !== "boolean") {
      throw new AppError(`isOpen must be boolean for ${day}`, 400);
    }

    if (!entry.isOpen) {
      const slots = entry?.slots;
      if (Array.isArray(slots) && slots.length > 0) {
        throw new AppError(`slots must be empty when shop is closed on ${day}`, 400);
      }

      entriesByDay.set(day, {
        day,
        isOpen: false,
        slots: [],
      });
      continue;
    }

    const normalizedSlots = normalizeSlots({
      slots: entry?.slots,
      day,
      ownerLabel: "Shop",
      allowEmpty: false,
    });

    entriesByDay.set(day, {
      day,
      isOpen: true,
      slots: normalizedSlots,
    });
  }

  return VALID_DAYS.map((day) => entriesByDay.get(day));
};

const normalizeShopWeeklyAvailabilityForComparison = (shopWeeklyAvailability) => {
  assertCompleteWeek(shopWeeklyAvailability);

  const entriesByDay = new Map();

  for (const entry of shopWeeklyAvailability) {
    const day = normalizeDay(entry?.day);
    const isOpen = Boolean(entry?.isOpen);

    if (!isOpen) {
      entriesByDay.set(day, { day, isOpen: false, slots: [] });
      continue;
    }

    let rawSlots = [];

    if (Array.isArray(entry?.slots) && entry.slots.length > 0) {
      rawSlots = entry.slots;
    } else if (
      typeof entry?.openTime === "string" &&
      typeof entry?.closeTime === "string"
    ) {
      // Backward compatibility for already persisted single-range records.
      rawSlots = [
        {
          startTime: entry.openTime,
          endTime: entry.closeTime,
        },
      ];
    }

    const normalizedSlots = normalizeSlots({
      slots: rawSlots,
      day,
      ownerLabel: "Shop",
      allowEmpty: false,
    });

    entriesByDay.set(day, {
      day,
      isOpen: true,
      slots: normalizedSlots,
    });
  }

  return VALID_DAYS.map((day) => entriesByDay.get(day));
};

const validateServiceWeeklyAvailability = ({
  weeklyAvailability,
  shopWeeklyAvailability,
}) => {
  assertCompleteWeek(weeklyAvailability);
  const normalizedShop = normalizeShopWeeklyAvailabilityForComparison(
    shopWeeklyAvailability,
  );
  const shopByDay = new Map(normalizedShop.map((entry) => [entry.day, entry]));

  const entriesByDay = new Map();

  for (const entry of weeklyAvailability) {
    const day = normalizeDay(entry?.day);
    const isOpen =
      typeof entry?.isOpen === "boolean"
        ? entry.isOpen
        : Boolean(entry?.isAvailable);

    if (!isOpen) {
      const slots = entry?.slots;
      if (Array.isArray(slots) && slots.length > 0) {
        throw new AppError(
          `slots must be empty when service is closed on ${day}`,
          400,
        );
      }

      entriesByDay.set(day, {
        day,
        isOpen: false,
        slots: [],
      });
      continue;
    }

    const serviceSlots = normalizeSlots({
      slots: entry?.slots,
      day,
      ownerLabel: "Service",
      allowEmpty: false,
    });

    const shopDay = shopByDay.get(day);
    if (!shopDay || !shopDay.isOpen) {
      throw new AppError(
        `Service cannot be open on ${day} because shop is closed`,
        400,
      );
    }

    const normalizedShopSlots = shopDay.slots.map((shopSlot) => ({
      startMinutes: parseTimeToMinutes(
        shopSlot.startTime,
        `shop slot startTime for ${day}`,
      ),
      endMinutes: parseTimeToMinutes(
        shopSlot.endTime,
        `shop slot endTime for ${day}`,
      ),
    }));

    for (const serviceSlot of serviceSlots) {
      const serviceStart = parseTimeToMinutes(
        serviceSlot.startTime,
        `service slot startTime for ${day}`,
      );
      const serviceEnd = parseTimeToMinutes(
        serviceSlot.endTime,
        `service slot endTime for ${day}`,
      );

      const isInsideShopSlot = normalizedShopSlots.some(
        (shopSlot) =>
          serviceStart >= shopSlot.startMinutes &&
          serviceEnd <= shopSlot.endMinutes,
      );

      if (!isInsideShopSlot) {
        throw new AppError(
          `Service availability must be within shop working hours for ${day}`,
          400,
        );
      }
    }

    entriesByDay.set(day, {
      day,
      isOpen: true,
      slots: serviceSlots,
    });
  }

  return VALID_DAYS.map((day) => entriesByDay.get(day));
};

module.exports = {
  VALID_DAYS,
  TIME_TEXT_REGEX,
  normalizeDay,
  parseTimeToMinutes,
  minutesToTimeText,
  validateShopWeeklyAvailability,
  validateServiceWeeklyAvailability,
};
