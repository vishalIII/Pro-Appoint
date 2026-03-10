import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    userId: localStorage.getItem("userId") // or from your auth state
  }
});

export default socket;