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
const appointmentRoutes = require("./routes/appointment/appointment.routes.js")
const publicShopRoutes = require("./routes/public/public.shop.routes.js");
const publicAppointmentRoutes = require('./routes/public/public.appointment.routes.js');
const notificationRoutes = require("./routes/notification/notification.routes.js");
const videoRoutes = require("./routes/video/video.routes.js");
const meetingRoutes = require("./routes/meeting/meeting.routes.js");
require("dotenv").config();


/* -------- Middleware -------- */
app.use(cors({
  origin: 'http://127.0.0.1:5173', 
  credentials: true               
}))
app.use(express.json());
// Normalize multiple slashes in incoming URLs to prevent accidental '//' segments
app.use((req, res, next) => {
  try {
    if (req.url && req.url.includes('//')) {
      req.url = req.url.replace(/\/{2,}/g, '/');
    }
  } catch (e) {
    // ignore and continue
  }
  next();
});
const authMiddleware = require("./middlewares/auth.middleware.js")
const adminAuthMiddleware=require("./middlewares/admin/adminAuth.middleware.js")
const tenantAuthMiddleware=require("./middlewares/tenant/tenantAuth.middleware.js")


// ----------Auto Job -----------
const { startAppointmentLifecycleJob } = require("./jobs/appointmentLifecycle.job.js");
startAppointmentLifecycleJob();

/* -------- app.get routes -------- */

app.use("/api/auth", authRoutes); //Register and login

// Mount tenant routes under both /api/tenant and /api/service for backward compatibility
app.use("/api/tenant", authMiddleware, tenantRoutes);  //it contains applying as tenant, applying for shop, and shop CRUD with nested services

app.use("/api/admin",authMiddleware,adminRoutes)

app.use("/api/payment",paymentRoutes);

// Public shop & service browsing routes (customers) NOT require authentication for browsing.
app.use("/api/shops", publicShopRoutes);

// New public appointment endpoints (bookings independent from shop nested path) ===== for customer appointments
// app.use('/api/customer', authMiddleware, publicAppointmentRoutes);

app.use(
  "/api/customer/appointments",
  authMiddleware,
  publicAppointmentRoutes
);

app.use("/api/notifications", authMiddleware, notificationRoutes);

app.use("/api/video", videoRoutes);
app.use("/api/meeting", meetingRoutes);

// // Public-facing appointment routes (customers can book without being a tenant)
// // example: POST /api/shops/:shopId/appointments 
// app.use("/api/shops/:shopId/appointments", authMiddleware, appointmentRoutes);

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

// console.log("IIIIIIDDDDD")
// console.log(process.env.ZEGO_SERVER_SECRET)
//------------------------------------------------ JUST Testing
app.get("/test-notification", (req,res)=>{
 const { getIO } = require("./socket/socket")

 const io = getIO()

 io.emit("notification",{
   title:"Test",
   message:"Socket working"
 })

 res.send("sent")
})
//------------------------------------------------

app.use(errorHandler)

module.exports = app;
