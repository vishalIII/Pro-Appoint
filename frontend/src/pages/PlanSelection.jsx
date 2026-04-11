import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { registerProviderSubscription, verifySubscriptionPayment } from "../auth/authApi"; // new apis
import { useAuth } from "../auth/useAuth";

const PLANS = [
  { id: "basic", name: "Basic", price: 1, description: "1 shop, 25 services/resources" },
  { id: "pro", name: "Pro", price: 2, description: "2 shops, 100 services/resources" },
  { id: "enterprise", name: "Enterprise", price: 3, description: "3 shops, unlimited services/resources" }
];

export default function PlanSelection() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user, updateUser } = useAuth();
  let razorpayInstance = null;


  useEffect(() => {
    if (!userId) {
      navigate("/register", { replace: true });
      return;
    }
  }, [userId, navigate]);

  const loadRazorpay = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(window.Razorpay);
      };
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    });
  }, []);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setError("");
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError("Please select a plan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await registerProviderSubscription({ userId, plan: selectedPlan.id });
      const rzpOrderId = order.id;

      const rzp = await loadRazorpay();
      if (!rzp) {
        throw new Error("Failed to load Razorpay");
      }

      razorpayInstance = new rzp({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_yourkey", // replace with actual test key
        amount: order.amount,
        currency: order.currency,
        name: "Service Provider Subscription",
        description: selectedPlan.name,
        order_id: rzpOrderId,
        handler: async function (response) {
          // Payment success callback - verify backend
          const verifyResponse = await verifySubscriptionPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: order.amount / 100 // rupees
          });

          if (verifyResponse.upgraded) {
            // Update user role and tenantId
            const updatedUser = {
              ...user,
              role: 'ServiceProvider',
              tenantId: verifyResponse.tenantId
            };
            updateUser(updatedUser);

            navigate("/tenant", { 
              replace: true,
              state: { message: `Welcome Service Provider (${selectedPlan.name} plan)!` }
            });
          } else {
            setError("Payment verified but upgrade failed. Please contact support.");
          }
        },
        prefill: {
          name: "User",
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled. Role remains Customer.");
            setLoading(false);
          }
        }
      });

      razorpayInstance.open();
    } catch (err) {
      setError(err.message || "Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return <p>Loading...</p>;

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Select Subscription Plan</h1>
        <p>Complete your Service Provider registration</p>
        {error ? <p className="error-text">{error}</p> : null}

        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''}`} onClick={() => handlePlanSelect(plan)}>
              <h3>{plan.name}</h3>
              <div className="price">₹{plan.price}</div>
              <p>{plan.description}</p>
            </div>
          ))}
        </div>

        <button 
          className="btn" 
          onClick={handleSubscribe}
          disabled={!selectedPlan || loading}
        >
          {loading ? "Processing..." : `Subscribe ${selectedPlan?.name || ''}`}
        </button>

       
      </div>

      <style jsx>{`
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
        .plan-card {
          border: 2px solid #ddd;
          padding: 1rem;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s;
        }
        .plan-card:hover, .plan-card.selected {
          border-color: #3399cc;
          background: #f0f8ff;
        }
        .price {
          font-size: 2rem;
          font-weight: bold;
          color: #3399cc;
          margin: 0.5rem 0;
        }
        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .checkbox-field input[type="checkbox"] {
          width: auto;
          margin: 0;
        }
      `}</style>
    </section>
  );
}

