const crypto = require("crypto");
const config = require("../../config/zegocloud.config");

const DEFAULT_TTL = config.defaultTtlSeconds || 7200;

function generateToken({
  userId,
  roomId,
  role = "attendee",
  ttlSeconds = DEFAULT_TTL,
}) {
  if (!config.appId || !config.serverSecret) {
    throw new Error("ZEGO_APP_ID or ZEGO_SERVER_SECRET missing");
  }

  if (!roomId) {
    throw new Error("roomId is required for token generation");
  }

  const now = Math.floor(Date.now() / 1000);

  // ✅ Ensure valid TTL
  const ttl = Number(ttlSeconds || DEFAULT_TTL);
  if (!ttl || ttl <= 0) {
    throw new Error("Invalid ttlSeconds");
  }

  const exp = now + ttl;

  const payload = {
    app_id: Number(config.appId),
    user_id: String(userId),
    room_id: String(roomId),
    role,
    exp,
    nonce: crypto.randomBytes(8).toString("hex"),
    ts: now,
  };

  // ✅ Stable stringify (important for consistent signature)
  const payloadString = JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", config.serverSecret)
    .update(payloadString)
    .digest("hex");

  const token = Buffer.from(
    JSON.stringify({
      payload,
      signature,
    })
  ).toString("base64url");

  return {
    token,
    expireAt: exp * 1000, // ms for frontend
  };
}

module.exports = {
  generateToken,
};