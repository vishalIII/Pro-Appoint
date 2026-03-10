const toIsoDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayIsoDate = () => toIsoDate(new Date());

export const getUtcStartOfDay = (dateLike) => {
  const date = new Date(dateLike);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
};

export const getUtcEndOfDay = (dateLike) => {
  const date = new Date(dateLike);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
};

export const getRangeFromPreset = ({ preset, customFrom, customTo }) => {
  const now = new Date();
  const todayStart = getUtcStartOfDay(now);
  const todayEnd = getUtcEndOfDay(now);

  if (preset === "custom") {
    const fromDate = customFrom
      ? getUtcStartOfDay(`${customFrom}T00:00:00.000Z`)
      : todayStart;
    const toDate = customTo
      ? getUtcEndOfDay(`${customTo}T00:00:00.000Z`)
      : todayEnd;
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }

  if (preset === "tomorrow") {
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    return {
      from: tomorrowStart.toISOString(),
      to: getUtcEndOfDay(tomorrowStart).toISOString(),
    };
  }

  if (preset === "upcoming") {
    const futureEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    return {
      from: now.toISOString(),
      to: getUtcEndOfDay(futureEnd).toISOString(),
    };
  }

  if (preset === "past") {
    return {
      from: new Date(0).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "week") {
    const dayOffset = (todayStart.getUTCDay() + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - dayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    return {
      from: weekStart.toISOString(),
      to: getUtcEndOfDay(weekEnd).toISOString(),
    };
  }

  if (preset === "month") {
    const fromDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    return {
      from: fromDate.toISOString(),
      to: todayEnd.toISOString(),
    };
  }

  return {
    from: todayStart.toISOString(),
    to: todayEnd.toISOString(),
  };
};

export const getDateLabel = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

export const getDateTimeLabel = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

export const getRevenueRangeForPreset = (preset) => {
  if (preset === "month") return "month";
  if (["today", "tomorrow"].includes(preset)) return "day";
  return "week";
};
