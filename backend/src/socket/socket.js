const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*"
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