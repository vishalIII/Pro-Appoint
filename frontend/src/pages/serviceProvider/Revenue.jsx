import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import LineTrendChart from "./components/LineTrendChart";
import { fetchRevenueAnalytics } from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getRevenueRangeForPreset } from "./utils/dateRange";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function ProviderRevenuePage() {
  const { token } = useAuth();
  const { selectedShopId, rangePreset } = useProviderWorkspace();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");

    try {
      const payload = await fetchRevenueAnalytics({
        token,
        shopId: selectedShopId,
        range: getRevenueRangeForPreset(rangePreset),
      });
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || "Failed to load revenue analytics");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [rangePreset, selectedShopId, token]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Revenue</h1>
        {isLoading ? <p>Loading revenue...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && data ? (
          <>
            <div className="provider-kpi-grid">
              <div>
                <p>Net Revenue</p>
                <strong>{formatCurrency(data?.totals?.netRevenue)}</strong>
              </div>
              <div>
                <p>Paid</p>
                <strong>{formatCurrency(data?.totals?.paid)}</strong>
              </div>
              <div>
                <p>Pending</p>
                <strong>{formatCurrency(data?.totals?.pending)}</strong>
              </div>
              <div>
                <p>Refunded</p>
                <strong>{formatCurrency(data?.totals?.refunded)}</strong>
              </div>
              <div>
                <p>Failed</p>
                <strong>{formatCurrency(data?.totals?.failed)}</strong>
              </div>
            </div>

            <LineTrendChart data={Array.isArray(data?.trend) ? data.trend : []} />
          </>
        ) : null}
      </article>
    </section>
  );
}
