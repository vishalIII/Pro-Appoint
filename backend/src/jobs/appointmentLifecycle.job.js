const Appointment = require("../models/appointment/appointment.model");

const DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS = 60;

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

const startAppointmentLifecycleJob = () => {
  if (autoCancelTimer) {
    return;
  }

  // Run once immediately on startup.
  autoCancelPendingAppointmentsPastStart().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial pending auto-cancel run failed:",
      error.message,
    );
  });

  autoCancelTimer = setInterval(() => {
    autoCancelPendingAppointmentsPastStart().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Pending auto-cancel run failed:",
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

module.exports = {
  startAppointmentLifecycleJob,
  autoCancelPendingAppointmentsPastStart,
};
