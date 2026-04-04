import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../notifications/useNotifications";

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

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    isFetchingMore,
    hasMore,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const navigate = useNavigate();
  const sentinelRef = useRef(null);

  const sortedNotifications = notifications;

  const handleOpen = (notification) => {
    if (!notification) return;
    markAsRead(notification._id);
    if (notification.data?.route) {
      navigate(notification.data.route);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);



  // Debounced load more (300ms) with inline debounce
  const debouncedLoadMore = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (hasMore && !isFetchingMore) {
        loadMoreNotifications();
      }
    }, 300);
  }, [hasMore, isFetchingMore, loadMoreNotifications]);

  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetchingMore && !loading) {
          debouncedLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isFetchingMore, loading, debouncedLoadMore, notifications.length]);



  return (
    <section className="page-block">
      <div className="card">
        <div className="page-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

        {loading ? (
          <div className="loading-spinner" style={{ textAlign: "center", padding: "2rem" }}>
            Loading notifications...
          </div>
        ) : sortedNotifications.length === 0 ? (
          <p className="muted-text">No notifications yet.</p>
        ) : (
          <>
            <div className="customer-notification-list">
{sortedNotifications.map((notification) => (
                <article
                  key={notification._id}
                  className={`customer-notification-card${notification.isRead ? "" : " is-unread"}`}
                  onClick={() => handleOpen(notification)}
                >
                  <div>
                    <strong>{notification.title}</strong>
                    <p className="muted-text">{notification.message}</p>
                  </div>
                  <div className="customer-notification-meta">
                    <span>{formatDateTime(notification.createdAt)}</span>
                    {notification.data?.route ? (
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpen(notification);
                        }}
                      >
                        View
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {isFetchingMore && (
                <div className="loading-more" style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                  Loading more notifications...
                </div>
              )}
            </div>
            {hasMore ? (
              <div ref={sentinelRef} style={{ height: "20px" }} />
            ) : (
              notifications.length > 0 && (
                <p className="muted-text" style={{ textAlign: "center", padding: "1rem" }}>
                  No more notifications
                </p>
              )
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default NotificationsPage;
