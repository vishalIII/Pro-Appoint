const AppError = require("./appError");

const DEFAULT_TIMEZONE = "UTC";

const isValidTimezone = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeTimezone = (
  value,
  { fallback = DEFAULT_TIMEZONE, fieldLabel = "timezone", required = false } = {},
) => {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate) {
    if (required) {
      throw new AppError(`${fieldLabel} is required`, 400);
    }

    return fallback;
  }

  if (!isValidTimezone(candidate)) {
    throw new AppError(`Invalid ${fieldLabel}`, 400);
  }

  return candidate;
};

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  normalizeTimezone,
};
