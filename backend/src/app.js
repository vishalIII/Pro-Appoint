const express = require("express");
const app = express();
const User = require("./models/user/user.model.js")
const Tenant = require("./models/tenant/tenant.model.js")
const authRoutes = require("./routes/auth.routes");

/* -------- Routes -------- */

/* -------- Middleware -------- */
app.use(express.json());

/* -------- app.get routes -------- */
app.use("/api/auth", authRoutes);

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

/* -------- 404 -------- */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
