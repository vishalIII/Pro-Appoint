import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { SubscriptionGuardProvider } from "./subscription/SubscriptionGuardProvider";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <SubscriptionGuardProvider>
        <App />
      </SubscriptionGuardProvider>
    </AuthProvider>
  </BrowserRouter>
);
