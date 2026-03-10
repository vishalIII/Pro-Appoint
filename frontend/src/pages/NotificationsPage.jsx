import { useEffect, useState } from "react";
import axios from "axios";

const NotificationsPage = () => {

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {

    const fetchNotifications = async () => {

      const res = await axios.get(
        "http://localhost:5000/api/notifications"
      );

      setNotifications(res.data);
    };

    fetchNotifications();

  }, []);

  return (
    <div>
      <h2>Notifications</h2>

      {notifications.map((n) => (
        <div key={n._id}>
          <h4>{n.title}</h4>
          <p>{n.message}</p>
        </div>
      ))}

    </div>
  );
};

export default NotificationsPage;