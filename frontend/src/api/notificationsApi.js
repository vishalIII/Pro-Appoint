import api from "../auth/api";

export const fetchNotifications = async ({ cursor = null, limit = 10 } = {}) => {
  const params = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const { data } = await api.get("/notifications", {
    params
  });
  return data;
};

export const markNotificationRead = async ({ notificationId }) => {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch("/notifications/read-all");
  return data;
};
