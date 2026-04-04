import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchNotifications as fetchNotificationsRequest,
  markNotificationRead as markNotificationReadRequest,
  markAllNotificationsRead as markAllNotificationsReadRequest,
} from "../api/notificationsApi";
import NotificationContext from "./context";

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const loadNotifications = useCallback(async (reset = false) => {
    if (reset) {
      setNotifications([]);
      setNextCursor(null);
      setHasMore(true);
    }
    if (!token || !hasMore) return;

    const isLoadingMore = !reset;
    if (isLoadingMore) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const cursor = reset ? null : nextCursor;
      const payload = await fetchNotificationsRequest({ cursor, limit: 10 });
      const newData = payload.data || [];

      setNotifications((prev) => [...prev, ...newData]);

      setNextCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
      setUnreadCount(payload.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [token, nextCursor, hasMore]);

  const loadMoreNotifications = useCallback(() => {
    loadNotifications(false);
  }, [loadNotifications]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications(true);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(true);
      setNextCursor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const addNotification = useCallback((notification) => {
    if (!notification) return;
    setNotifications((prev) => {
      if (prev.some((item) => item._id === notification._id)) {
        return prev.map((item) =>
          item._id === notification._id ? notification : item
        );
      }
      return [notification, ...prev].slice(0, 200);
    });
    setUnreadCount((prev) => prev + (notification.isRead ? 0 : 1));
  }, []);

  const markAsRead = useCallback(
    async (notificationId) => {
      const existing = notifications.find((item) => item._id === notificationId);
      if (!existing || existing.isRead) return existing;
      try {
        const updated = await markNotificationReadRequest({ notificationId });
        setNotifications((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return updated;
      } catch (error) {
        console.error("Failed to mark notification as read", error);
        return null;
      }
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token || unreadCount === 0) return;
    try {
      await markAllNotificationsReadRequest();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  }, [token, unreadCount]);

  const refreshNotifications = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  const contextValue = useMemo(
    () => ({
      notifications,
      loading,
      isFetchingMore,
      hasMore,
      nextCursor,
      unreadCount,
      loadNotifications,
      loadMoreNotifications,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      addNotification,
    }),
    [
      notifications,
      loading,
      isFetchingMore,
      hasMore,
      nextCursor,
      unreadCount,
      loadNotifications,
      loadMoreNotifications,
      markAsRead,
      markAllAsRead,
      addNotification,
    ]
  );

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};
