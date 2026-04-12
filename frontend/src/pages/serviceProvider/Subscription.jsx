import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { fetchSubscription } from "./api/providerApi";
import { getDateLabel } from "./utils/dateRange";

export default function ProviderSubscriptionPage() {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubscription = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError("");
    try {
      const payload = await fetchSubscription({ token });
      setSubscription(payload);
    } catch (loadError) {
      setError(loadError.message || "Failed to load subscription");
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Subscription</h1>
        {isLoading ? <p>Loading subscription...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && subscription ? (
          <div className="provider-kpi-grid">
            <div>
              <p>Plan</p>
              <strong>{subscription.plan}</strong>
            </div>
            <div>
              <p>Status</p>
              <strong>{subscription.planStatus}</strong>
            </div>
            <div>
              <p>Expiry</p>
              <strong>{getDateLabel(subscription.subscriptionEnd)}</strong>
            </div>
            <div>
              <p>Days left</p>
              <strong>{subscription.daysUntilExpiry ?? "N/A"}</strong>
            </div>
            <div>
              <p>Shop usage</p>
              <strong>
                {subscription.usage?.approvedShops || 0}/
                {subscription.limits?.maxShops ?? "-"}
              </strong>
            </div>
            <div>
              <p>Active Services</p>
              <strong>{subscription.usage?.activeServices || 0}</strong>
            </div>
            <div>
              <p>Active Resources</p>
              <strong>{subscription.usage?.activeResources || 0}</strong>
            </div>
          </div>
        ) : null}

        <div className="actions-row">
          <Link className="btn" to="/plan-selection">
            Upgrade Plan
          </Link>
          <button type="button" className="btn btn-secondary" onClick={loadSubscription}>
            Refresh
          </button>
        </div>
      </article>
    </section>
  );
}
