import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { registerProviderSubscription, verifySubscriptionPayment } from "../auth/authApi";
import { useAuth } from "../auth/useAuth";
import { setAccessToken } from "../auth/api";
import { ROLES } from "../rbac";
import { fetchSubscription } from "./serviceProvider/api/providerApi";

const PLANS = [
  { id: "basic", name: "Basic", price: 1, description: "1 shop, 25 services/resources" },
  { id: "pro", name: "Pro", price: 2, description: "2 shops, 100 services/resources" },
  { id: "enterprise", name: "Enterprise", price: 3, description: "3 shops, unlimited services/resources" }
];

const loadCheckoutScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existing = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.dataset.razorpaySdk = "true";
    script.async = true;
    script.addEventListener("load", () => resolve(window.Razorpay));
    script.addEventListener("error", () => resolve(null), { once: true });
    document.body.appendChild(script);
  });

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(Boolean(window.Razorpay));
  const razorpayInstanceRef = useRef(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(user?.role === ROLES.PROVIDER);
  const [subscriptionError, setSubscriptionError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { redirectTo: "/plan-selection" } });
      return;
    }

    if (user && user.role !== ROLES.CUSTOMER && user.role !== ROLES.PROVIDER) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, isAuthenticated, navigate]);

  const planPriority = useMemo(
    () => ({
      basic: 0,
      pro: 1,
      enterprise: 2,
    }),
    [],
  );

  const currentPlanRank = subscription ? planPriority[subscription.plan] ?? -1 : -1;
  const availablePlans = useMemo(() => {
    if (!subscription) return PLANS;
    return PLANS.filter((plan) => planPriority[plan.id] >= currentPlanRank);
  }, [subscription, planPriority, currentPlanRank]);

  useEffect(() => {
    if (!availablePlans.length) {
      setSelectedPlan(null);
      return;
    }

    if (!selectedPlan || !availablePlans.some((plan) => plan.id === selectedPlan.id)) {
      setSelectedPlan(availablePlans[0]);
    }
  }, [availablePlans, selectedPlan]);

  useEffect(() => {
    let mounted = true;
    if (user?.role !== ROLES.PROVIDER) {
      setSubscription(null);
      setSubscriptionLoading(false);
      setSubscriptionError("");
      return () => {
        mounted = false;
      };
    }

    const loadSubscription = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError("");
      try {
        const payload = await fetchSubscription();
        if (!mounted) return;
        setSubscription(payload);
      } catch (err) {
        if (!mounted) return;
        setSubscription(null);
        setSubscriptionError(err.message || "Failed to load subscription");
      } finally {
        if (mounted) {
          setSubscriptionLoading(false);
        }
      }
    };

    loadSubscription();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    let mounted = true;
    loadCheckoutScript().then((rzp) => {
      if (!mounted) return;
      setRazorpayReady(Boolean(rzp));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setError("");
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      setError("Choose a plan to continue");
      return;
    }

    if (!user) {
      setError("Unable to determine your account. Please log in again.");
      return;
    }

    if (subscription && planPriority[selectedPlan.id] < currentPlanRank) {
      setError("Select a higher plan to upgrade or extend your current plan.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await registerProviderSubscription({ plan: selectedPlan.id });
      const rzp = await loadCheckoutScript();
      if (!rzp) {
        throw new Error("Failed to load payment gateway");
      }

      setRazorpayReady(true);

      razorpayInstanceRef.current = new rzp({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_yourkey",
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Pro Appoint",
        description: `${selectedPlan.name} plan`,
        handler: async (response) => {
          try {
            const verifyResponse = await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount / 100,
            });

            if (!verifyResponse?.upgraded && !verifyResponse?.extended) {
              throw new Error("Payment verified but upgrade failed. Contact support.");
            }

            if (verifyResponse.accessToken) {
              setAccessToken(verifyResponse.accessToken);
            }

            if (verifyResponse.user) {
              updateUser(verifyResponse.user);
            }

            navigate("/tenant", {
              replace: true,
              state: { message: `Welcome Service Provider (${selectedPlan.name} plan)!` },
            });
          } catch (verifyError) {
            setError(verifyError.message || "Subscription verification failed");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled. Role remains Customer.");
            setLoading(false);
          },
        },
        theme: {
          color: "#3399cc",
        },
      });

      razorpayInstanceRef.current.open();
    } catch (err) {
      setError(err.message || "Failed to initiate subscription");
      setLoading(false);
    }
  };

  if (!user || !isAuthenticated) {
    return (
      <section className="auth-page">
        <div className="card auth-card">
          <h1>Subscription</h1>
          <p>Loading your account...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Select Subscription Plan</h1>
        <p>Complete your Service Provider registration</p>
        {subscription ? (
          subscriptionLoading ? (
            <p>Checking your current plan...</p>
          ) : subscriptionError ? (
            <p className="error-text">{subscriptionError}</p>
          ) : (
            <p>
              Current plan: <strong>{subscription.plan}</strong> (
              {subscription.daysUntilExpiry ?? "N/A"} days left)
            </p>
          )
        ) : (
          <p>Select a plan to activate your service provider account.</p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="plans-grid">
          {availablePlans.map((plan) => {
            const planRank = planPriority[plan.id];
            const planState =
              subscription && planPriority[plan.id] <= currentPlanRank
                ? planRank === currentPlanRank
                  ? "current"
                  : "locked"
                : "upgrade";

            const isLocked = planState === "locked";
            const isSelected = selectedPlan?.id === plan.id;
            const badge =
              planState === "locked"
                ? "Not available"
                : planState === "current"
                ? "Current plan"
                : planState === "upgrade"
                ? subscription
                  ? "Upgrade"
                  : "Choose"
                : "";

            return (
              <div
                key={plan.id}
                className={`plan-card${isSelected ? " selected" : ""}${
                  isLocked ? " locked" : ""
                }`}
                onClick={() => !isLocked && handlePlanSelect(plan)}
              >
                <h3>{plan.name}</h3>
                <div className="price">₹{plan.price}</div>
                <p>{plan.description}</p>
                {badge ? <span className="plan-badge">{badge}</span> : null}
              </div>
            );
          })}
        </div>

        <button
          className="btn"
          onClick={handleUpgrade}
          disabled={
            loading ||
            !razorpayReady ||
            !selectedPlan ||
            (subscription && subscriptionLoading)
          }
        >
          {loading
            ? "Processing..."
            : subscription
            ? selectedPlan?.id === subscription.plan
              ? "Extend plan"
              : "Upgrade plan"
            : `Subscribe ${selectedPlan?.name || ""}`}
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
        .plan-card:hover,
        .plan-card.selected {
          border-color: #3399cc;
          background: #f0f8ff;
        }
        .price {
          font-size: 2rem;
          font-weight: bold;
          color: #3399cc;
          margin: 0.5rem 0;
        }
        .plan-card.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .plan-badge {
          display: inline-flex;
          margin-top: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
          background: #333;
        }
        .plan-card.selected .plan-badge {
          background: #0055aa;
        }
      `}</style>
    </section>
  );
}
