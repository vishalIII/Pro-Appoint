import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../notifications/useNotifications";
import StatusPill from "./components/StatusPill";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ProviderNotificationsPage() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    loadMoreNotifications,
    hasMore,
    isFetchingMore,
    loading,
  } = useNotifications();
  const navigate = useNavigate();
  const sentinelRef = useRef(null);

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
      ),
    [notifications],
  );

  const hasUnread = useMemo(() => notifications.some((n) => !n.isRead), [notifications]);

  const handleOpen = (notification) => {
    if (!notification) return;
    markAsRead(notification._id);
    const route = notification.data?.route || "/tenant/appointments";
    navigate(route);
  };

  const handleIntersect = useCallback(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !isFetchingMore && !loading) {
        loadMoreNotifications();
      }
    },
    [hasMore, isFetchingMore, loading, loadMoreNotifications],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "200px 0px",
      threshold: 0,
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <section className="provider-page">
      <article className="card">
        <div className="provider-section-header">
          <h1>Notifications</h1>
          {notifications.length > 0 && (
            <button
              type="button"
              className="btn btn-small"
              onClick={markAllAsRead}
              disabled={!hasUnread}
            >
              Mark all read
            </button>
          )}
        </div>
        {loading && sorted.length === 0 ? (
          <div className="loading-spinner" style={{ padding: "2rem", textAlign: "center" }}>
            Loading notifications...
          </div>
        ) : sorted.length === 0 ? (
          <p className="muted-text">No notifications yet.</p>
        ) : (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Message</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((notification) => (
                  <tr
                    key={notification._id}
                    className={notification.isRead ? "" : "provider-row-unread"}
                    onClick={() => handleOpen(notification)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{formatDateTime(notification.createdAt)}</td>
                    <td>{notification.message}</td>
                    <td>{notification.data?.serviceName || "Service"}</td>
                    <td>{notification.data?.customerName || "Customer"}</td>
                    <td>
                      <StatusPill value={notification.data?.status || notification.type} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => handleOpen(notification)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {isFetchingMore && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: "center", padding: "12px", color: "#66705a" }}
                    >
                      Loading more notifications...
                    </td>
                  </tr>
                )}
                {hasMore && (
                  <tr>
                    <td colSpan={6}>
                      <div ref={sentinelRef} style={{ height: "1px" }} />
                    </td>
                  </tr>
                )}
                {!hasMore && notifications.length > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: "center", padding: "12px", color: "#66705a" }}
                    >
                      No more notifications
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
