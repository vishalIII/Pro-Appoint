import { useMemo } from "react";
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
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
      ),
    [notifications],
  );

  const handleOpen = (notification) => {
    if (!notification) return;
    markAsRead(notification._id);
    const route = notification.data?.route || "/tenant/appointments";
    navigate(route);
  };

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
      disabled={!notifications.some(n => !n.isRead)}
    >
      Mark all read
    </button>
  )}
</div>
        {sorted.length === 0 ? (
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
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
