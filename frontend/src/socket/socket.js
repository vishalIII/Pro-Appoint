import { io } from "socket.io-client";

const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_BASE_URL || "http://localhost:5000";

let socketInstance = null;
let connectedUserId = null;

export const connectNotificationSocket = ({ userId }) => {
  if (!userId) {
    return null;
  }

  if (socketInstance && connectedUserId === userId) {
    return socketInstance;
  }

  disconnectNotificationSocket();

  socketInstance = io(SOCKET_BASE_URL, {
    auth: { userId },
    transports: ["websocket", "polling"],
  });

  connectedUserId = userId;
  return socketInstance;
};

export const disconnectNotificationSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectedUserId = null;
  }
};
