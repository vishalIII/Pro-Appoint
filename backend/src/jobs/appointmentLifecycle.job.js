const Appointment = require("../models/appointment/appointment.model");

const DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS = 60;
const DEFAULT_NO_SHOW_GRACE_MINUTES = 15;
const DEFAULT_ONLINE_END_BUFFER_MINUTES = 30;

const readPositiveIntFromEnv = (key, fallback) => {
  const raw = process.env[key];

  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const AUTO_CANCEL_INTERVAL_SECONDS = readPositiveIntFromEnv(
  "AUTO_CANCEL_PENDING_APPOINTMENTS_INTERVAL_SECONDS",
  DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS,
);

const NO_SHOW_GRACE_MINUTES = readPositiveIntFromEnv(
  "NO_SHOW_GRACE_MINUTES",
  DEFAULT_NO_SHOW_GRACE_MINUTES,
);

const ONLINE_END_BUFFER_MINUTES = readPositiveIntFromEnv(
  "ONLINE_JOIN_BUFFER_AFTER_END_MINUTES",
  DEFAULT_ONLINE_END_BUFFER_MINUTES,
);

let autoCancelTimer = null;

const autoCancelPendingAppointmentsPastStart = async () => {
  const now = new Date();

  const result = await Appointment.updateMany(
    {
      status: "pending",
      startTimeUTC: { $lte: now },
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "failed",
        expiresAt: now,
        "cancellation.cancelledAt": now,
        "cancellation.reason":
          "Auto-cancelled because appointment start time passed while still pending",
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-cancelled ${result.modifiedCount} pending appointments`,
    );
  }
};

// Offline: mark no-show shortly after start if still confirmed
const autoMarkOfflineNoShow = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000);

  const result = await Appointment.updateMany(
    {
      mode: "offline",
      status: "confirmed",
      startTimeUTC: { $lte: cutoff },
    },
    {
      $set: {
        status: "no_show",
        noShowMarkedAt: now,
        noShowMarkedBySystem: true,
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-marked ${result.modifiedCount} offline appointments as no_show`,
    );
  }
};

// Online: meeting never started and join window expired -> no_show
const autoMarkOnlineNoShow = async () => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - ONLINE_END_BUFFER_MINUTES * 60 * 1000,
  );

  const result = await Appointment.updateMany(
    {
      mode: "online",
      status: "confirmed",
      endTimeUTC: { $lte: cutoff },
      $or: [
        { "meeting.startedAt": { $exists: false } },
        { "meeting.startedAt": null },
      ],
    },
    {
      $set: {
        status: "no_show",
        noShowMarkedAt: now,
        noShowMarkedBySystem: true,
        "meeting.status": "ended",
        "meeting.endedAt": now,
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-marked ${result.modifiedCount} online appointments as no_show`,
    );
  }
};

// Online: meeting started but not closed after buffer -> complete & end
const autoCompleteOnlineMeetings = async () => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - ONLINE_END_BUFFER_MINUTES * 60 * 1000,
  );

  const result = await Appointment.updateMany(
    {
      mode: "online",
      status: "confirmed",
      endTimeUTC: { $lte: cutoff },
      "meeting.startedAt": { $exists: true, $ne: null },
      $or: [
        { "meeting.endedAt": { $exists: false } },
        { "meeting.endedAt": null },
      ],
    },
    {
      $set: {
        status: "completed",
        completedAt: now,
        "meeting.status": "ended",
        "meeting.endedAt": now,
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-completed ${result.modifiedCount} online meetings`,
    );
  }
};

// -------------------- FINALIZER (attendance-driven) --------------------
const finalizeAppointments = async () => {
  const now = new Date();
  const offlineCutoff = new Date(
    now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000,
  );

  // ONLINE: finalize at/after endTime
  const onlineAppointments = await Appointment.find({
    status: "confirmed",
    mode: "online",
    endTimeUTC: { $lte: now },
  }).lean();

  for (const appt of onlineAppointments) {
    const customerJoined = Boolean(appt.attendance?.customerJoined);
    const providerJoined = Boolean(appt.attendance?.providerJoined);

    let status = "no_show";
    let noShowType = "both";
    let completedAt = undefined;

    if (customerJoined && providerJoined) {
      status = "completed";
      noShowType = undefined;
      completedAt = now;
    } else if (customerJoined && !providerJoined) {
      status = "no_show";
      noShowType = "provider";
    } else if (!customerJoined && providerJoined) {
      status = "no_show";
      noShowType = "customer";
    } else {
      status = "no_show";
      noShowType = "both";
    }

    await Appointment.updateOne(
      { _id: appt._id, status: "confirmed" },
      {
        $set: {
          status,
          noShowType,
          completedAt,
          "meeting.status": "ended",
          "meeting.endedAt": now,
        },
      },
    );
  }

  // OFFLINE: evaluate after 15-minute grace from start
  const offlineAppointments = await Appointment.find({
    status: "confirmed",
    mode: "offline",
    startTimeUTC: { $lte: offlineCutoff },
  }).lean();

  for (const appt of offlineAppointments) {
    const customerJoined = Boolean(appt.attendance?.customerJoined);

    const status = customerJoined ? "completed" : "no_show";
    const noShowType = customerJoined ? undefined : "customer";
    const completedAt = customerJoined ? now : undefined;

    await Appointment.updateOne(
      { _id: appt._id, status: "confirmed" },
      {
        $set: {
          status,
          noShowType,
          completedAt,
        },
      },
    );
  }
};

const startAppointmentLifecycleJob = () => {
  if (autoCancelTimer) {
    return;
  }

  autoCancelExpiredPendingAppointments().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial expired pending cleanup failed:",
      error.message,
    );
  });

  // Run once immediately on startup
  autoCancelPendingAppointmentsPastStart().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial pending auto-cancel run failed:",
      error.message,
    );
  });

  finalizeAppointments().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial finalize run failed:",
      error.message,
    );
  });

  autoCancelTimer = setInterval(() => {
    autoCancelExpiredPendingAppointments().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Expired pending cleanup failed:",
        error.message,
      );
    });

    autoCancelPendingAppointmentsPastStart().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Pending auto-cancel run failed:",
        error.message,
      );
    });

    finalizeAppointments().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Finalize run failed:",
        error.message,
      );
    });
  }, AUTO_CANCEL_INTERVAL_SECONDS * 1000);

  if (typeof autoCancelTimer.unref === "function") {
    autoCancelTimer.unref();
  }

  console.log(
    `[AppointmentLifecycleJob] Started. Interval: ${AUTO_CANCEL_INTERVAL_SECONDS}s`,
  );
};

const autoCancelExpiredPendingAppointments = async () => {
  const now = new Date();

  const result = await Appointment.updateMany(
    {
      status: "pending",
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "failed",
        "cancellation.cancelledAt": now,
        "cancellation.reason": "Auto-cancelled because payment window expired",
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-cancelled ${result.modifiedCount} expired pending appointments`,
    );
  }
};

module.exports = {
  startAppointmentLifecycleJob,
  autoCancelPendingAppointmentsPastStart,
  autoMarkOfflineNoShow,
  autoMarkOnlineNoShow,
  autoCompleteOnlineMeetings,
  autoCancelExpiredPendingAppointments,
  finalizeAppointments,
};
