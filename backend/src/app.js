const express = require("express");
const app = express();
const cors = require("cors");
const User = require("./models/user/user.model.js")
const Tenant = require("./models/tenant/tenant.model.js")
const errorHandler = require("./middlewares/errorHandler.middleware.js")
/* -------- Routes -------- */
const authRoutes = require("./routes/auth/auth.routes.js");
const tenantRoutes=require("./routes/tenant/index.js")
const adminRoutes = require("./routes/admin/index.js")
const paymentRoutes = require("./routes/payment/payment.routes.js")
/* -------- Middleware -------- */
app.use(cors({
  origin: 'http://127.0.0.1:5173', 
  credentials: true               
}))
app.use(express.json());
const authMiddleware = require("./middlewares/auth.middleware.js")
const adminAuthMiddleware=require("./middlewares/admin/adminAuth.middleware.js")
const tenantAuthMiddleware=require("./middlewares/tenant/tenantAuth.middleware.js")

/* -------- app.get routes -------- */

app.use("/api/auth", authRoutes); //Register and login

app.use("/api/tenant",authMiddleware,tenantRoutes);  //it contains applying as tenant, applying for shop, and shop CRUD with nested services

app.use("/api/admin",authMiddleware,adminRoutes)

app.use("/api/payment",paymentRoutes);

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
