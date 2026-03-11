const {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../../services/notification.service");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const result = await getNotificationsForUser({
      userId: req.user.userId,
      page,
      limit: perPage,
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
