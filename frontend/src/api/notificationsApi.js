import api from "../auth/api";

export const fetchNotifications = async ({ page = 1, limit = 20 } = {}) => {
  const { data } = await api.get("/notifications", {
    params: { page, limit },
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
