const crypto = require("crypto");
const config = require("../../config/zegocloud.config");

function generateToken(userId, roomId) {

  const payload = {
    app_id: config.appID,
    user_id: userId,
    room_id: roomId,
    nonce: Date.now(),
    timestamp: Math.floor(Date.now() / 1000),
    expire: 3600
  };

  const payloadString = JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", config.serverSecret)
    .update(payloadString)
    .digest("hex");

  const token = Buffer.from(
    JSON.stringify({
      payload,
      signature
    })
  ).toString("base64");

  return token;

}

module.exports = {
  generateToken
};