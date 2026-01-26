const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");

/* -------- Routes -------- */
app.use("/api/auth", authRoutes);

/* -------- Middleware -------- */
app.use(express.json());

/* -------- app.get routes -------- */


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
