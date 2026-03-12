const crypto = require("crypto");
const config = require("../../config/zegocloud.config");

const DEFAULT_TTL = config.defaultTtlSeconds || 7200;

// Lightweight token signer (HMAC) kept backend-only. Replace with official ZEGOCLOUD helper when available.
function generateToken({ userId, roomId, role = "attendee", ttlSeconds = DEFAULT_TTL }) {
  if (!config.appId || !config.serverSecret) {
    throw new Error("ZEGO_APP_ID or ZEGO_SERVER_SECRET missing");
  }

  if (!roomId) {
    throw new Error("roomId is required for token generation");
  }

  const exp = Math.floor(Date.now() / 1000) + Number(ttlSeconds || DEFAULT_TTL);
  const payload = {
    app_id: Number(config.appId),
    user_id: String(userId),
    room_id: String(roomId),
    role,
    exp,
    nonce: crypto.randomBytes(8).toString("hex"),
    ts: Math.floor(Date.now() / 1000),
  };

  const signature = crypto
    .createHmac("sha256", config.serverSecret)
    .update(JSON.stringify(payload))
    .digest("hex");

  const token = Buffer.from(
    JSON.stringify({
      payload,
      signature,
    }),
  ).toString("base64url");

  return { token, expireAt: exp * 1000 };
}

module.exports = {
  generateToken,
};
