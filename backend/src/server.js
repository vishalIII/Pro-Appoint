import app from "./app.js";
import connectDB from "./config/db.js";


connectDB();


app.listen(5000, () => console.log("API running on 5000"));