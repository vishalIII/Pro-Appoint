import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export default function Subscription() {
  const [isRazorpayReady, setIsRazorpayReady] = useState(Boolean(window.Razorpay));
  const [loadingError, setLoadingError] = useState("");

  useEffect(() => {
    if (window.Razorpay) {
      setIsRazorpayReady(true);
      return;
    }

    let script = document.querySelector('script[data-razorpay-sdk="true"]');

    const handleLoad = () => {
      setIsRazorpayReady(true);
      setLoadingError("");
    };

    const handleError = () => {
      setLoadingError("Failed to load Razorpay checkout script.");
      setIsRazorpayReady(false);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpaySdk = "true";
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
    }

    return () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, []);

  const payNow = async () => {
    setLoadingError("");

    if (!window.Razorpay || !isRazorpayReady) {
      setLoadingError("Payment SDK is still loading. Please try again.");
      return;
    }

    try {
      const orderResponse = await fetch(`${API_BASE_URL}/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: 1 })
      });

      const orderPayload = await parseJsonSafely(orderResponse);

      if (!orderResponse.ok) {
        throw new Error(orderPayload?.message || "Failed to create order");
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderPayload.amount,
        currency: "INR",
        name: "My SaaS App",
        description: "One-time payment",
        order_id: orderPayload.id,
        handler: async (response) => {
          const finalResponse = { ...response, amount: 1 };
          const verifyResponse = await fetch(`${API_BASE_URL}/payment/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(finalResponse)
          });

          const verifyPayload = await parseJsonSafely(verifyResponse);

          if (!verifyResponse.ok || !verifyPayload?.success) {
            alert(verifyPayload?.message || "Payment verification failed");
            return;
          }

          alert("Payment successful");
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setLoadingError(error.message || "Payment failed");
    }
  };

  return (
    <section className="page-block">
      <div className="card">
        <h1>Subscription Payment</h1>
        <p>Razorpay SDK is loaded only on this payment screen.</p>

        {loadingError ? <p className="error-text">{loadingError}</p> : null}

        <button className="btn" type="button" onClick={payNow} disabled={!isRazorpayReady}>
          {isRazorpayReady ? "Pay INR 499" : "Preparing checkout..."}
        </button>
      </div>
    </section>
  );
}
