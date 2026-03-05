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
  const today = getUtcStartOfDay(new Date());

  if (preset === "custom") {
    const fromDate = customFrom
      ? getUtcStartOfDay(`${customFrom}T00:00:00.000Z`)
      : today;
    const toDate = customTo
      ? getUtcEndOfDay(`${customTo}T00:00:00.000Z`)
      : getUtcEndOfDay(today);
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }

  if (preset === "week") {
    const fromDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    return {
      from: fromDate.toISOString(),
      to: getUtcEndOfDay(today).toISOString(),
    };
  }

  if (preset === "month") {
    const fromDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    return {
      from: fromDate.toISOString(),
      to: getUtcEndOfDay(today).toISOString(),
    };
  }

  return {
    from: today.toISOString(),
    to: getUtcEndOfDay(today).toISOString(),
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
