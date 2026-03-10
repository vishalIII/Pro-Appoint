const Appointment = require("../models/appointment/appointment.model");

console.log("Running lifecycle job at", new Date());

const DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS = 60;
const DEFAULT_NO_SHOW_GRACE_MINUTES = 15;

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
  DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS
);

const NO_SHOW_GRACE_MINUTES = readPositiveIntFromEnv(
  "NO_SHOW_GRACE_MINUTES",
  DEFAULT_NO_SHOW_GRACE_MINUTES
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
    }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-cancelled ${result.modifiedCount} pending appointments`
    );
  }
};

const autoMarkNoShowAppointments = async () => {
  const now = new Date();

  const cutoff = new Date(
    now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000
  );

  const result = await Appointment.updateMany(
    {
      status: "confirmed",
      startTimeUTC: { $lte: cutoff },
    },
    {
      $set: {
        status: "no_show",
        noShowMarkedAt: now,
        noShowMarkedBySystem: true,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-marked ${result.modifiedCount} appointments as no_show`
    );
  }
};

const startAppointmentLifecycleJob = () => {
  if (autoCancelTimer) {
    return;
  }

  // Run once immediately on startup
  autoCancelPendingAppointmentsPastStart().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial pending auto-cancel run failed:",
      error.message
    );
  });

  autoMarkNoShowAppointments().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial no-show run failed:",
      error.message
    );
  });

  autoCancelTimer = setInterval(() => {
    autoCancelPendingAppointmentsPastStart().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Pending auto-cancel run failed:",
        error.message
      );
    });

    autoMarkNoShowAppointments().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] No-show auto-mark run failed:",
        error.message
      );
    });
  }, AUTO_CANCEL_INTERVAL_SECONDS * 1000);

  if (typeof autoCancelTimer.unref === "function") {
    autoCancelTimer.unref();
  }

  console.log(
    `[AppointmentLifecycleJob] Started. Interval: ${AUTO_CANCEL_INTERVAL_SECONDS}s`
  );
};

module.exports = {
  startAppointmentLifecycleJob,
  autoCancelPendingAppointmentsPastStart,
  autoMarkNoShowAppointments,
};