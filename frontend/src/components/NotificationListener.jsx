import { useEffect } from "react";
import socket from "../socket/socket";

const NotificationListener = () => {

  useEffect(() => {

    socket.on("notification", (data) => {
      console.log("New Notification:", data);

      alert(data.title); // simple UI example
    });

    return () => {
      socket.off("notification");
    };

  }, []);

  return null;
};

export default NotificationListener;