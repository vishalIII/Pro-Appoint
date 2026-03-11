import { useMemo } from "react";
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
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [notifications],
  );

  const handleOpen = (notification) => {
    if (!notification) return;
    markAsRead(notification._id);
    if (notification.data?.route) {
      navigate(notification.data.route);
    }
  };

  return (
    <section className="page-block">
      <div className="card">
        <div className="page-title-row">
          <h1>Notifications</h1>
        </div>

        {sorted.length === 0 ? (
          <p className="muted-text">No notifications yet.</p>
        ) : (
          <div className="customer-notification-list">
            {sorted.map((notification) => (
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
          </div>
        )}
      </div>
    </section>
  );
};

export default NotificationsPage;
