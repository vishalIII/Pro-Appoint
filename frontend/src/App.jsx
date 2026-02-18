import AppRoutes from "./routes/AppRoutes";
import { useEffect } from "react";
function App() {
   useEffect(() => {
    // Prevent loading script multiple times
    if (window.Razorpay) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay script loaded");
    };

    script.onerror = () => {
      console.error("Failed to load Razorpay script");
    };

    document.body.appendChild(script);
  }, []);
  return (
    <div>
      <AppRoutes />
    </div>
  );
}

export default App;
