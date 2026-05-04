import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "../config/runtime";

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
