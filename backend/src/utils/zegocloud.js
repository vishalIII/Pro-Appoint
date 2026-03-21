const crypto = require('crypto');
const config = require('../config/zegocloud.config');
const mongoose = require('mongoose');

/**
 * Verify ZEGOCLOUD webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signatureHeader - X-Zego-Server-Sign header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.serverSecret || !signatureHeader) {
    console.warn('ZEGO_SERVER_SECRET missing or no signature header');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.serverSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signatureHeader, 'utf8')
  );
}

/**
 * Parse ZEGOCLOUD room_id to find appointment
 * Assumes format: appointmentId_startTimeUTC (e.g. '67fabc1234567890abcdef12_2024-01-15T10:00:00.000Z')
 * Implement based on generateRoomId logic from appointment services
 * @param {string} roomId
 * @returns {Promise<ObjectId|null>} appointmentId
 */
async function parseRoomIdForAppointment(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;

  // Split by common separators/delimiters
  const parts = roomId.split(/[_-]/);
  
  // Try last part as ISO date
  const potentialDate = parts[parts.length - 1];
  if (potentialDate && !isNaN(Date.parse(potentialDate))) {
    // First part likely appointmentId (24 hex chars)
    const potentialId = parts[0];
    if (mongoose.Types.ObjectId.isValid(potentialId)) {
      return new mongoose.Types.ObjectId(potentialId);
    }
  }

  // Fallback: check if full roomId looks like ObjectId prefix
  if (mongoose.Types.ObjectId.isValid(roomId.substring(0, 24))) {
    return new mongoose.Types.ObjectId(roomId.substring(0, 24));
  }

  console.warn(`Could not parse appointmentId from roomId: ${roomId}`);
  return null;
}

/**
 * Determine if user is host for appointment
 * @param {Object} appointment - Mongoose doc
 * @param {string} userId - ZEGO user_id
 * @returns {boolean}
 */
function isHost(appointment, userId) {
  if (!appointment || !appointment.tenantId) return false;
  return appointment.tenantId.toString() === userId;
}

module.exports = {
  verifyWebhookSignature,
  parseRoomIdForAppointment,
  isHost,
};

