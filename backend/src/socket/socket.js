const { Server } = require("socket.io");
const { allowedOrigins } = require("../config/cors.js");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    }
  });

  io.on("connection", (socket) => {

    const userId = socket.handshake.auth.userId;

    if (userId) {
      socket.join(userId);
    }

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });

  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

module.exports = { initSocket, getIO };
