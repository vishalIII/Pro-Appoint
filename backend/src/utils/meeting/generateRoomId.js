const crypto = require("crypto");

function generateRoomId(appointmentId) {

  const random = crypto.randomBytes(3).toString("hex");

  return `apt_${appointmentId}_${random}`;

}

module.exports = generateRoomId;