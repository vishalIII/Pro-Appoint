const express = require("express");
const app = express();
const User = require("./models/user/user.model.js")
const Tenant = require("./models/tenant/tenant.model.js")
const errorHandler = require("./middlewares/errorHandler.middleware.js")
/* -------- Routes -------- */
const authRoutes = require("./routes/auth/auth.routes.js");
const tenantRoutes=require("./routes/tenant/tenantApplication.routes.js")
const adminRoutes = require("./routes/admin/index.js")
/* -------- Middleware -------- */
app.use(express.json());
const authMiddleware = require("./middlewares/auth.middleware.js")
const adminAuthMiddlware=require("./middlewares/admin/adminAuth.middleware.js")
const tenantAuthMiddleware=require("./middlewares/tenant/tenantAuth.middleware.js")
/* -------- app.get routes -------- */

app.use("/api/auth", authRoutes); //Register and login

app.use("/api/tenant",authMiddleware,tenantRoutes); 

app.use("/api/admin",authMiddleware,adminAuthMiddlware,adminRoutes)




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

app.use(errorHandler)

module.exports = app;
