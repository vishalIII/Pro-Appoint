const crypto = require("crypto");

/**
 * Generates a deterministic, collision-safe room id that fits ZEGOCLOUD limits (<128 chars).
 * We mix appointment id + base36 of start time + short random salt to avoid collisions
 * while remaining stable enough for logs.
 */
function generateRoomId(appointmentId, startTimeUTC) {
  const timePart = startTimeUTC
    ? Number(new Date(startTimeUTC).getTime() || Date.now()).toString(36)
    : "";
  const random = crypto.randomBytes(3).toString("base64url"); // 4 chars
  const base = `apt-${appointmentId}-${timePart}-${random}`;

  // Ensure max length 64 to stay well under SDK limit
  return base.slice(0, 64);
}

module.exports = generateRoomId;
