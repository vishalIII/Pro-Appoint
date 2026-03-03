import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ROLES } from "../../rbac";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const PLAN_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" }
];

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export default function ApplyProvider() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!token) {
      navigate("/login", { replace: true, state: { redirectTo: "/provider/apply" } });
      return;
    }

    if (user?.role === ROLES.PROVIDER) {
      navigate("/tenant", { replace: true });
      return;
    }

    if (user?.role !== ROLES.CUSTOMER) {
      setError("Only customer accounts can apply as service provider.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tenant/create-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to apply as service provider");
      }

      if (payload?.token && payload?.user) {
        login({ user: payload.user, token: payload.token });
      }

      navigate("/tenant", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Failed to apply as service provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-block">
      <div className="card">
        <h1>Apply as Service Provider</h1>
        <p className="muted-text">
          Choose a subscription plan and submit your provider application.
        </p>

        {error ? <p className="error-text">{error}</p> : null}

        {user?.role === ROLES.PROVIDER ? (
          <div className="actions-row">
            <p className="success-text">Your account is already a service provider.</p>
            <button type="button" className="btn" onClick={() => navigate("/tenant")}>
              Go to Provider Dashboard
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field" htmlFor="plan">
              Subscription Plan
              <select
                id="plan"
                name="plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                disabled={isSubmitting}
              >
                {PLAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
