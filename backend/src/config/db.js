const mongoose = require("mongoose");

// Try multiple URIs so it works both inside Docker (host = mongo) and local (host = localhost)
const buildUriList = () => {
  const fromEnv = process.env.MONGO_URI && process.env.MONGO_URI.trim();
  const fallbacks = [
    "mongodb://mongo:27017/proappoint",
    "mongodb://localhost:27017/proappoint",
  ];
  return [fromEnv, ...fallbacks].filter(Boolean);
};

const connectDB = async () => {
  const uris = buildUriList();
  let lastErr = null;

  for (const uri of uris) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      lastErr = error;
      console.warn(`Mongo connect failed for ${uri}: ${error.message}`);
    }
  }

  console.error("❌ MongoDB connection failed (all URIs tried)");
  if (lastErr) {
    console.error(lastErr.message);
  }
  process.exit(1);
};

module.exports = connectDB;
