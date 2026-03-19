// Simple in-memory active participant tracker with a pluggable surface
// for future Redis migration. Stores participants per roomId.

const activeRooms = new Map(); // roomId -> Map<userId, metadata>

function getRoom(roomId) {
  const id = String(roomId);
  if (!activeRooms.has(id)) {
    activeRooms.set(id, new Map());
  }
  return activeRooms.get(id);
}

function addUser(roomId, userId, metadata = {}) {
  const room = getRoom(roomId);
  const key = String(userId);
  const alreadyPresent = room.has(key);
  room.set(key, { ...metadata, joinedAt: metadata.joinedAt || new Date() });
  return !alreadyPresent;
}

function removeUser(roomId, userId) {
  if (!roomId) return false;
  const room = activeRooms.get(String(roomId));
  if (!room) return false;
  const removed = room.delete(String(userId));
  if (room.size === 0) {
    activeRooms.delete(String(roomId));
  }
  return removed;
}

function hasUser(roomId, userId) {
  const room = activeRooms.get(String(roomId));
  if (!room) return false;
  return room.has(String(userId));
}

function count(roomId) {
  const room = activeRooms.get(String(roomId));
  return room ? room.size : 0;
}

function list(roomId) {
  const room = activeRooms.get(String(roomId));
  if (!room) return [];
  return Array.from(room.entries()).map(([userId, meta]) => ({ userId, ...meta }));
}

function clearRoom(roomId) {
  activeRooms.delete(String(roomId));
}

// Placeholder hooks for Redis migration. Swap implementations here later.
const backend = "memory";

module.exports = {
  backend,
  addUser,
  removeUser,
  hasUser,
  count,
  list,
  clearRoom,
};
