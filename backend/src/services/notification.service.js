const Notification = require("../models/notification/notification.model");
const { getIO } = require("../socket/socket");
const AppError = require("../utils/appError");

async function sendNotification(payload) {
  const notification = await Notification.create(payload);
  const io = getIO();
  io.to(payload.userId.toString()).emit("notification", notification);
  return notification;
}

async function getNotificationsForUser({ userId, limit = 10, cursor = null } = {}) {
  const query = { userId };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  const results = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  const hasMore = results.length > limit;
  const data = results.slice(0, limit);
  const nextCursor = hasMore ? data[data.length - 1]._id.toString() : null;
  return { 
    data, 
    nextCursor, 
    hasMore, 
    unreadCount 
  };
}

async function markNotificationRead({ notificationId, userId }) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true },
  );

  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
}

async function markAllNotificationsRead(userId) {
  if (!userId) return;
  await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
}

module.exports = {
  sendNotification,
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
};
