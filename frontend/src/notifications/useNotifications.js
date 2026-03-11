import { useContext } from "react";
import NotificationContext from "./context";

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
