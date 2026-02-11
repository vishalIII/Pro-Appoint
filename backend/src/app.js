const express = require("express");
const app = express();

/* -------- Models (if needed) -------- */
const User = require("./models/user/user.model.js");
const Tenant = require("./models/tenant/tenant.model.js");

/* -------- Routes -------- */
const authRoutes = require("./routes/auth/auth.routes.js");
const tenantRoutes = require("./routes/tenant/index.js");
const adminRoutes = require("./routes/admin/index.js");
const serviceRoutes = require("./routes/service/service.routes.js");

/* -------- Middlewares -------- */
app.use(express.json());

const authMiddleware = require("./middlewares/auth.middleware.js");

/* -------- Routes Usage -------- */

// Auth
app.use("/api/auth", authRoutes);

// Tenant
app.use("/api/tenant", authMiddleware, tenantRoutes);

// Admin
app.use("/api/admin", authMiddleware, adminRoutes);

// Service
app.use("/api/service", authMiddleware, serviceRoutes);

/* -------- Test Routes -------- */

app.get("/", (req, res) => {
  res.send("Home API working");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    time: new Date(),
  });
});

app.get("/hello", (req, res) => {
  res.send("Hello from Node.js 🚀");
});

/* -------- 404 Handler -------- */
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

/* -------- Global Error Handler (VERY IMPORTANT) -------- */
app.use((err, req, res, next) => {
  console.error("ERROR 💥", err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";

  // 🔹 Handle Mongoose Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // 🔹 Handle Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  res.status(statusCode).json({
    status: "error",
    message,
  });
});


module.exports = app;
