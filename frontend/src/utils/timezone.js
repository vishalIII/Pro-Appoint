import dayjs from "./dayjs";

export const DEFAULT_TIMEZONE = "UTC";
const STORAGE_KEY = "preferredDisplayTimezone";
let supportedTimezoneOptionsCache = null;
let supportedTimezoneOptionsCacheMinute = "";

export const isValidTimezone = (value) => {
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

export const getDetectedTimezone = () => {
  try {
    const guessed = dayjs.tz.guess();
    return isValidTimezone(guessed) ? guessed : DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

export const getSupportedTimezones = () => {
  const detected = getDetectedTimezone();

  try {
    if (typeof Intl?.supportedValuesOf === "function") {
      return [...new Set([detected, ...Intl.supportedValuesOf("timeZone"), DEFAULT_TIMEZONE])];
    }
  } catch {
    return [...new Set([detected, DEFAULT_TIMEZONE])];
  }

  return [...new Set([detected, DEFAULT_TIMEZONE])];
};

const OFFSET_NAME_REGEX = /^(GMT|UTC)([+-]\d{1,2}(?::\d{2})?)?$/i;

const formatOffsetLabel = (offsetMinutes, prefix) => {
  if (!Number.isFinite(offsetMinutes)) {
    return prefix;
  }

  if (offsetMinutes === 0) {
    return prefix;
  }

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `${prefix}${sign}${hours}`;
  }

  return `${prefix}${sign}${hours}:${String(minutes).padStart(2, "0")}`;
};

const getTimeZoneNamePart = (timeZone, timeZoneName) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName,
    });
    return (
      formatter
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value || ""
    );
  } catch {
    return "";
  }
};

const formatZoneIdentifier = (timeZone) => {
  if (!timeZone) return DEFAULT_TIMEZONE;

  return timeZone
    .split("/")
    .map((segment) =>
      segment
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(" / ");
};

const formatZonePath = (timeZone) => {
  if (!timeZone) return DEFAULT_TIMEZONE;

  return timeZone
    .split("/")
    .map((segment) => segment.replaceAll("_", " "))
    .join("/");
};

const buildAbbreviationFromName = (timeZoneName) => {
  if (!timeZoneName) return "";
  if (timeZoneName === "Coordinated Universal Time") return "UTC";

  const words = timeZoneName
    .replace(/[()]/g, "")
    .split(/[\s/-]+/)
    .filter(Boolean)
    .filter((word) => !["and", "of", "the"].includes(word.toLowerCase()));

  const abbreviation = words
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return abbreviation;
};

const deriveTimezoneLabels = (timeZone) => {
  const longNameRaw = getTimeZoneNamePart(timeZone, "long");
  const shortNameRaw = getTimeZoneNamePart(timeZone, "short");
  const longName =
    longNameRaw && !OFFSET_NAME_REGEX.test(longNameRaw)
      ? longNameRaw
      : `${formatZoneIdentifier(timeZone)} Time`;

  let abbreviation = "";

  if (shortNameRaw && !OFFSET_NAME_REGEX.test(shortNameRaw) && shortNameRaw.length <= 8) {
    abbreviation = shortNameRaw.toUpperCase();
  } else {
    abbreviation = buildAbbreviationFromName(longName);
  }

  if (!abbreviation) {
    abbreviation = timeZone === DEFAULT_TIMEZONE ? DEFAULT_TIMEZONE : formatZoneIdentifier(timeZone);
  }

  return {
    abbreviation,
    longName,
  };
};

const buildTimezoneOption = (timeZone) => {
  const zonedNow = dayjs().tz(timeZone);
  const offsetMinutes = zonedNow.utcOffset();
  const currentTime = zonedNow.format("ddd h:mm A");
  const utcOffset = formatOffsetLabel(offsetMinutes, "UTC");
  const gmtOffset = formatOffsetLabel(offsetMinutes, "GMT");
  const { abbreviation, longName } = deriveTimezoneLabels(timeZone);
  const zonePath = formatZonePath(timeZone);

  return {
    value: timeZone,
    label: zonePath,
    triggerLabel: zonePath,
    primaryText: zonePath,
    secondaryText: `${longName}  ${abbreviation}  ${utcOffset}  ${gmtOffset}  ${currentTime}`,
    tertiaryText: "",
    abbreviation,
    longName,
    currentTime,
    utcOffset,
    gmtOffset,
    zonePath,
    searchText: [
      zonePath,
      abbreviation,
      longName,
      currentTime,
      utcOffset,
      gmtOffset,
      timeZone,
    ].join(" "),
  };
};

export const getSupportedTimezoneOptions = () => {
  const cacheMinute = dayjs.utc().format("YYYY-MM-DDTHH:mm");

  if (
    supportedTimezoneOptionsCache &&
    supportedTimezoneOptionsCacheMinute === cacheMinute
  ) {
    return supportedTimezoneOptionsCache;
  }

  supportedTimezoneOptionsCacheMinute = cacheMinute;
  supportedTimezoneOptionsCache = getSupportedTimezones()
    .map((timeZone) => buildTimezoneOption(timeZone))
    .sort((left, right) => {
      if (left.abbreviation !== right.abbreviation) {
        return left.abbreviation.localeCompare(right.abbreviation);
      }

      if (left.longName !== right.longName) {
        return left.longName.localeCompare(right.longName);
      }

      return left.value.localeCompare(right.value);
    });

  return supportedTimezoneOptionsCache;
};

export const getSavedTimezone = () => {
  if (typeof window === "undefined") return "";

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) || "";
    return isValidTimezone(saved) ? saved : "";
  } catch {
    return "";
  }
};

export const clearPreferredTimezone = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
};

export const persistPreferredTimezone = (timezone) => {
  if (typeof window === "undefined") return;

  if (!isValidTimezone(timezone) || timezone === getDetectedTimezone()) {
    clearPreferredTimezone();
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, timezone);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
};

export const resolvePreferredTimezone = () =>
  getSavedTimezone() || getDetectedTimezone();

export const getTodayInTimezone = (timezone) =>
  dayjs().tz(timezone || DEFAULT_TIMEZONE).format("YYYY-MM-DD");

export const formatDateTimeInTimezone = (
  value,
  timezone,
  format = "ddd, MMM D, YYYY h:mm A",
) => {
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) return "N/A";
  return parsed.tz(timezone || DEFAULT_TIMEZONE).format(format);
};

export const formatTimeWindowInTimezone = ({
  startTimeUTC,
  endTimeUTC,
  timezone,
}) => {
  const start = dayjs.utc(startTimeUTC);
  const end = dayjs.utc(endTimeUTC);
  const zone = timezone || DEFAULT_TIMEZONE;

  if (!start.isValid() || !end.isValid()) {
    return "N/A";
  }

  const startLocal = start.tz(zone);
  const endLocal = end.tz(zone);

  if (startLocal.isSame(endLocal, "day")) {
    return `${startLocal.format("ddd, MMM D, YYYY h:mm A")} - ${endLocal.format("h:mm A")}`;
  }

  return `${startLocal.format("ddd, MMM D, YYYY h:mm A")} - ${endLocal.format("ddd, MMM D, YYYY h:mm A")}`;
};
