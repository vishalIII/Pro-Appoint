import { Link } from "react-router-dom";
import { useNotifications } from "../notifications/useNotifications";

const NotificationBell = ({ to = "/notifications" }) => {
  const { unreadCount } = useNotifications();

  return (
    <Link to={to} className="notification-bell" aria-label="View notifications">
      <span className="notification-bell-icon" aria-hidden="true">
        🔔
      </span>
      {unreadCount > 0 && (
        <span className="notification-bell-count" aria-live="polite">
          {unreadCount}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
