require("dotenv").config();
const http = require("http");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { startAppointmentLifecycleJob } = require("./src/jobs/appointmentLifecycle.job");
const { initSocket } = require("./src/socket/socket");

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {

  await connectDB();

  startAppointmentLifecycleJob();

  const server = http.createServer(app);


  

  initSocket(server);   // initialized socket here

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}❤️`);
  });

};

bootstrap();