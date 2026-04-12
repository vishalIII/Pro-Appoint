import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PlanUpgradePanel from "../components/PlanUpgradePanel";
import { ROLES } from "../rbac";

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { redirectTo: "/plan-selection" } });
      return;
    }

    if (user && ![ROLES.CUSTOMER, ROLES.PROVIDER].includes(user.role)) {
      navigate("/unauthorized", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated) {
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
        <PlanUpgradePanel
          title="Select Subscription Plan"
          subtitle="Complete your Service Provider registration"
        />
      </div>
    </section>
  );
}
