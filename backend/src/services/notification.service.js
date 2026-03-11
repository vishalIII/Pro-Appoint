const Notification = require("../models/notification/notification.model");
const { getIO } = require("../socket/socket");
const AppError = require("../utils/appError");

async function sendNotification(payload) {
  const notification = await Notification.create(payload);
  const io = getIO();
  io.to(payload.userId.toString()).emit("notification", notification);
  return notification;
}

async function getNotificationsForUser({ userId, limit = 20, page = 1 } = {}) {
  const skip = Math.max(0, page - 1) * limit;
  const filters = { userId };
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filters),
    Notification.countDocuments({ ...filters, isRead: false }),
  ]);
  return {
    notifications,
    total,
    unreadCount,
    page,
    perPage: limit,
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
