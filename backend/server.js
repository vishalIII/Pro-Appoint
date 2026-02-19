require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB();
// app.use(cors({
//    origin: [
//     "http://localhost:5173",
//     "http://127.0.0.1:5173"
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true
// }));
/* ===== FORCE CORS (DEV SAFE) ===== */


/* ===== MIDDLEWARE ===== */

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}❤️`);
});
