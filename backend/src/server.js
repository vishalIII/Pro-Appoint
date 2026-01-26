import app from "./app.js";
import connectDB from "./config/db.js";

connectDB();

const PORT = 5000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));