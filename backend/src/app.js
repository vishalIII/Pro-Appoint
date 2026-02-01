const express = require("express");
const app = express();
const User = require("./models/user/user.model.js")
const Tenant = require("./models/tenant/tenant.model.js")

/* -------- Routes -------- */
const authRoutes = require("./routes/auth.routes");
const tenantRoutes=require("./routes/tenant/tenantApplication.routes.js")

/* -------- Middleware -------- */
app.use(express.json());
const authMiddleware = require("./middlewares/auth.middleware.js")
const adminAuthMiddlware=require("./middlewares/admin/adminAuth.middleware.js")
/* -------- app.get routes -------- */

app.use("/api/auth", authRoutes); //Register and login

app.use("/api/tenant",authMiddleware,tenantRoutes); 






//-------------------------------------------------------------------
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
