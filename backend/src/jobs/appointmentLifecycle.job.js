const Appointment = require("../models/appointment/appointment.model");

const DEFAULT_AUTO_CANCEL_INTERVAL_SECONDS = 60;
const DEFAULT_NO_SHOW_GRACE_MINUTES = 15;
const DEFAULT_ONLINE_END_BUFFER_MINUTES = 30;
const DEFAULT_HOST_GRACE_MINUTES = 5;
const DEFAULT_ATTENDEE_GRACE_MINUTES = 5;
const DEFAULT_MIN_HOST_SECONDS = 60;
const DEFAULT_MIN_ATTENDEE_SECONDS = 60;

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

const HOST_GRACE_MINUTES = readPositiveIntFromEnv(
  "HOST_GRACE_MINUTES",
  DEFAULT_HOST_GRACE_MINUTES,
);

const ATTENDEE_GRACE_MINUTES = readPositiveIntFromEnv(
  "ATTENDEE_GRACE_MINUTES",
  DEFAULT_ATTENDEE_GRACE_MINUTES,
);

const MIN_HOST_SECONDS = readPositiveIntFromEnv(
  "MIN_HOST_SECONDS",
  DEFAULT_MIN_HOST_SECONDS,
);

const MIN_ATTENDEE_SECONDS = readPositiveIntFromEnv(
  "MIN_ATTENDEE_SECONDS",
  DEFAULT_MIN_ATTENDEE_SECONDS,
);

let autoCancelTimer = null;

const computeDurationSeconds = (participant, now) => {
  if (!participant || !Array.isArray(participant.joinEvents)) return 0;

  const events = [...participant.joinEvents].sort(
    (a, b) => new Date(a.at) - new Date(b.at),
  );

  let openJoin = null;
  let durationMs = 0;

  for (const ev of events) {
    if (ev.action === "join") {
      openJoin = new Date(ev.at);
    } else if (ev.action === "leave" && openJoin) {
      durationMs += new Date(ev.at) - openJoin;
      openJoin = null;
    }
  }

  if (openJoin) {
    durationMs += now - openJoin;
  }

  return durationMs / 1000;
};

const getParticipantDurations = (appointment, now) => {
  const hostId = appointment.tenantId?.toString();
  const attendeeId = appointment.attendeeId?.toString();
  const extraAttendees =
    Array.isArray(appointment.attendees) && appointment.attendees.length > 0
      ? appointment.attendees.map((a) => a?.userId?.toString()).filter(Boolean)
      : [];

  const participants = Array.isArray(appointment.meeting?.participants)
    ? appointment.meeting.participants
    : [];

  const findParticipant = (id) =>
    participants.find((p) => p.userId && p.userId.toString() === id);

  const hostDuration = hostId
    ? computeDurationSeconds(findParticipant(hostId), now)
    : 0;

  const attendeeDurations = [];
  if (attendeeId) {
    attendeeDurations.push(
      computeDurationSeconds(findParticipant(attendeeId), now),
    );
  }

  for (const extraId of extraAttendees) {
    attendeeDurations.push(
      computeDurationSeconds(findParticipant(extraId), now),
    );
  }

  const maxAttendeeDuration =
    attendeeDurations.length > 0 ? Math.max(...attendeeDurations) : 0;

  return { hostDuration, maxAttendeeDuration };
};

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

// Grace-based early no-show: host or attendee never showed within grace window
const autoGraceNoShowOnline = async () => {
  const now = new Date();

  const candidates = await Appointment.find({
    mode: "online",
    status: "confirmed",
    startTimeUTC: { $lte: now },
  })
    .limit(500)
    .lean(false);

  for (const appt of candidates) {
    const hostGraceCutoff = new Date(
      new Date(appt.startTimeUTC).getTime() + HOST_GRACE_MINUTES * 60 * 1000,
    );
    const attendeeGraceCutoff = new Date(
      new Date(appt.startTimeUTC).getTime() +
        ATTENDEE_GRACE_MINUTES * 60 * 1000,
    );

    const { hostDuration, maxAttendeeDuration } = getParticipantDurations(
      appt,
      now,
    );

    // Host never showed by host grace window
    if (now >= hostGraceCutoff && hostDuration === 0) {
      appt.status = "no_show";
      appt.meeting = appt.meeting || {};
      appt.meeting.status = "ended";
      appt.meeting.endedAt = now;
      await appt.save();
      continue;
    }

    // Host showed but attendee never showed by attendee grace window
    if (
      hostDuration > 0 &&
      now >= attendeeGraceCutoff &&
      maxAttendeeDuration === 0
    ) {
      appt.status = "no_show";
      appt.meeting = appt.meeting || {};
      appt.meeting.status = "ended";
      appt.meeting.endedAt = now;
      await appt.save();
    }
  }
};

// Online: meeting started but not closed after buffer -> complete & end, based on attendance
const autoCompleteOnlineMeetings = async () => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - ONLINE_END_BUFFER_MINUTES * 60 * 1000,
  );

  const candidates = await Appointment.find({
    mode: "online",
    status: "confirmed",
    endTimeUTC: { $lte: cutoff },
    "meeting.startedAt": { $exists: true, $ne: null },
    $or: [
      { "meeting.endedAt": { $exists: false } },
      { "meeting.endedAt": null },
    ],
  })
    .limit(500)
    .lean(false);

  let completed = 0;
  let noShows = 0;

  for (const appt of candidates) {
    const { hostDuration, maxAttendeeDuration } = getParticipantDurations(
      appt,
      now,
    );

    const hostOk = hostDuration >= MIN_HOST_SECONDS;
    const attendeeOk = maxAttendeeDuration >= MIN_ATTENDEE_SECONDS;

    appt.meeting = appt.meeting || {};
    appt.meeting.status = "ended";
    appt.meeting.endedAt = now;

    if (hostOk && attendeeOk) {
      appt.status = "completed";
      appt.completedAt = now;
      completed += 1;
    } else {
      appt.status = "no_show";
      appt.noShowMarkedAt = now;
      appt.noShowMarkedBySystem = true;
      noShows += 1;
    }

    await appt.save();
  }

  if (completed > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-completed ${completed} online meetings`,
    );
  }
  if (noShows > 0) {
    console.log(
      `[AppointmentLifecycleJob] Auto-marked ${noShows} online meetings as no_show (insufficient attendance)`,
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

  autoMarkOfflineNoShow().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial offline no-show run failed:",
      error.message,
    );
  });

  autoMarkOnlineNoShow().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial online no-show run failed:",
      error.message,
    );
  });

  autoCompleteOnlineMeetings().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial online completion run failed:",
      error.message,
    );
  });

  autoGraceNoShowOnline().catch((error) => {
    console.error(
      "[AppointmentLifecycleJob] Initial grace no-show run failed:",
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

    autoMarkOfflineNoShow().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Offline no-show run failed:",
        error.message,
      );
    });

    autoMarkOnlineNoShow().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Online no-show run failed:",
        error.message,
      );
    });

    autoCompleteOnlineMeetings().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Online completion run failed:",
        error.message,
      );
    });

    autoGraceNoShowOnline().catch((error) => {
      console.error(
        "[AppointmentLifecycleJob] Grace no-show run failed:",
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
  autoGraceNoShowOnline,
  autoCancelExpiredPendingAppointments,
};
