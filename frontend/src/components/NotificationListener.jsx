import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { useNotifications } from "../notifications/useNotifications";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from "../socket/socket";

const NotificationListener = () => {
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      disconnectNotificationSocket();
      return;
    }

    const socket = connectNotificationSocket({ userId: user.id });
    if (!socket) return undefined;

    const handleNotification = (payload) => {
      addNotification(payload);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
      disconnectNotificationSocket();
    };
  }, [isAuthenticated, user?.id, addNotification]);

  return null;
};

export default NotificationListener;
