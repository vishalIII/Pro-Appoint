const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on("error", (err) => console.error("🔴 Redis Error:", err.message || err));

// Graceful error handling for operations
const safeGet = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error("🔴 Redis GET failed:", err.message);
    return null;
  }
};

const safeSet = async (key, value, options) => {
  try {
    await redisClient.set(key, value, options);
    console.log("✅ Cache SET:", key.substring(0, 50) + "...");
  } catch (err) {
    console.error("🔴 Redis SET failed:", err.message);
  }
};

// Export safe wrappers + raw client
module.exports = {
  get: safeGet,
  set: safeSet,
  redisClient  // Keep raw client if needed elsewhere
};

// connect once when app starts
const connectRedis = async () => {
  let attempts = 5;

  while (attempts) {
    try {
      await redisClient.connect();
      console.log("✅ Redis Connected");
      break;
    } catch (err) {
      console.log("⏳ Waiting for Redis...");
      attempts--;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  if (!attempts) {
    console.error("❌ Could not connect to Redis");
  }
};

connectRedis();

