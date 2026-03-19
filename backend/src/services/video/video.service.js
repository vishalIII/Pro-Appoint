const crypto = require("crypto");
const config = require("../../config/zegocloud.config");

const DEFAULT_TTL = 3600; // 1 hour as required

function getAesKey(secret) {
  const raw = Buffer.from(secret, "utf8");
  if ([16, 24, 32].includes(raw.length)) {
    return raw;
  }
  // Normalize to 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
}

// Backend-only kit token generator (mirrors generateKitTokenForTest but keeps secret off the client)
function generateToken({ userId, userName, roomId, role = "attendee", ttlSeconds = DEFAULT_TTL }) {
  if (!config.appId || !config.serverSecret) {
    throw new Error("ZEGO_APP_ID or ZEGO_SERVER_SECRET missing");
  }

  if (!roomId) {
    throw new Error("roomId is required for token generation");
  }

  const exp = Math.floor(Date.now() / 1000) + Number(ttlSeconds || DEFAULT_TTL);
  const ctime = Math.floor(Date.now() / 1000);
  const payload = {
    app_id: Number(config.appId),
    user_id: String(userId),
    nonce: Math.floor(Math.random() * 2147483647),
    ctime,
    expire: exp,
  };

  let iv = Math.random().toString().substring(2, 18);
  if (iv.length < 16) {
    iv = (iv + iv).substring(0, 16);
  }

  const key = getAesKey(config.serverSecret);
  const algo =
    key.length === 16 ? "aes-128-cbc" : key.length === 24 ? "aes-192-cbc" : "aes-256-cbc";
  const keyLength = algo === "aes-128-cbc" ? 16 : algo === "aes-192-cbc" ? 24 : 32;

  const cipher = crypto.createCipheriv(algo, key.slice(0, keyLength), Buffer.from(iv, "utf8"));
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");

  const encryptedBytes = Buffer.from(encrypted, "base64");
  const buffer = Buffer.alloc(28 + encryptedBytes.length);

  buffer.writeUInt32BE(0, 0); // reserved
  buffer.writeUInt32BE(exp, 4);
  buffer.writeUInt16BE(iv.length, 8);
  buffer.write(iv, 10, "utf8");
  buffer.writeUInt16BE(encryptedBytes.length, 26);
  encryptedBytes.copy(buffer, 28);

  const tokenPrefix = `04${buffer.toString("base64")}`;
  const info = Buffer.from(
    JSON.stringify({
      userID: String(userId),
      roomID: String(roomId),
      userName: encodeURIComponent(userName || ""),
      appID: Number(config.appId),
      role,
    }),
  ).toString("base64");

  const token = `${tokenPrefix}#${info}`;

  return { token, expireAt: exp * 1000 };
}

module.exports = {
  generateToken,
};
