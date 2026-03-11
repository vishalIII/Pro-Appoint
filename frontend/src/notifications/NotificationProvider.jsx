import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchNotifications as fetchNotificationsRequest,
  markNotificationRead as markNotificationReadRequest,
  markAllNotificationsRead as markAllNotificationsReadRequest,
} from "../api/notificationsApi";
import NotificationContext from "./context";

const defaultPagination = {
  total: 0,
  unreadCount: 0,
  page: 1,
  perPage: 20,
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(
    async ({ page = 1, limit = 50 } = {}) => {
      if (!token) {
        setNotifications([]);
        setPagination({ ...defaultPagination });
        return;
      }

      setLoading(true);

      try {
        const payload = await fetchNotificationsRequest({ token, page, limit });
        const list = payload.notifications || [];
        setNotifications(list);
        setPagination({
          total: payload.total ?? list.length,
          unreadCount: payload.unreadCount ?? list.filter((item) => !item.isRead).length,
          page: payload.page ?? page,
          perPage: payload.perPage ?? limit,
        });
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
      return;
    }
    setNotifications([]);
    setPagination({ ...defaultPagination });
  }, [isAuthenticated, refreshNotifications]);

  const addNotification = useCallback((notification) => {
    if (!notification) return;
    setNotifications((prev) => {
      const deduped = prev.filter((item) => item._id !== notification._id);
      return [notification, ...deduped].slice(0, 200);
    });
    setPagination((prev) => ({
      ...prev,
      total: (prev.total || 0) + 1,
      unreadCount: (prev.unreadCount || 0) + (notification.isRead ? 0 : 1),
    }));
  }, []);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!token || !notificationId) return null;
      const existing = notifications.find((item) => item._id === notificationId);
      const wasUnread = existing && !existing.isRead;
      try {
        const updated = await markNotificationReadRequest({ token, notificationId });
        setNotifications((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        if (wasUnread) {
          setPagination((prev) => ({
            ...prev,
            unreadCount: Math.max(0, (prev.unreadCount || 1) - 1),
          }));
        }
        return updated;
      } catch (error) {
        console.error("Failed to mark notification as read", error);
        return null;
      }
    },
    [notifications, token],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsReadRequest({ token });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setPagination((prev) => ({
        ...prev,
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  }, [token]);

  const contextValue = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount: pagination.unreadCount,
      total: pagination.total,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      addNotification,
    }),
    [notifications, loading, pagination, refreshNotifications, markAsRead, markAllAsRead, addNotification],
  );

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};
