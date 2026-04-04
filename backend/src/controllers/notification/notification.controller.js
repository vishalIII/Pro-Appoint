const {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../../services/notification.service");

exports.list = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const cursor = req.query.cursor || null;

    const result = await getNotificationsForUser({
      userId: req.user.userId,
      limit,
      cursor,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await markNotificationRead({
      notificationId: req.params.notificationId,
      userId: req.user.userId,
    });
    return res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user.userId);
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
