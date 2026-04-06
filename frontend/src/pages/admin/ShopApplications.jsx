import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveShopApplication,
  fetchShopApplications,
  rejectShopApplication,
} from "../../api/adminApi";
import { useAuth } from "../../auth/useAuth";

const statusBadge = (status) => {
  const map = {
    pending: { label: "Pending", tone: "amber" },
    approved: { label: "Approved", tone: "green" },
    rejected: { label: "Rejected", tone: "red" },
    blocked: { label: "Blocked", tone: "slate" },
  };
  return map[status] || { label: status || "Unknown", tone: "slate" };
};

export default function ShopApplicationsPage() {
  const { token } = useAuth();
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({}); // {shopId: "pending"|"error"|"done"}
  const [rejectReason, setRejectReason] = useState("");

  const filtered = useMemo(() => {
    if (filter === "all") return apps;
    return apps.filter((app) => app.status === filter);
  }, [apps, filter]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchShopApplications({ pendingOnly: filter === "pending" });
      setApps(data);
    } catch (err) {
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (shopId) => {
    setActionState((s) => ({ ...s, [shopId]: "pending" }));
    try {
      await approveShopApplication(shopId);
      await load();
    } catch (err) {
      setActionState((s) => ({ ...s, [shopId]: "error" }));
      setError(err.message || "Approve failed");
    } finally {
      setActionState((s) => ({ ...s, [shopId]: "done" }));
    }
  };

  const handleReject = async (shopId) => {
    const reason = rejectReason.trim();
    setActionState((s) => ({ ...s, [shopId]: "pending" }));
    try {
      await rejectShopApplication({ shopId, reason });
      await load();
      setRejectReason("");
    } catch (err) {
      setActionState((s) => ({ ...s, [shopId]: "error" }));
      setError(err.message || "Reject failed");
    } finally {
      setActionState((s) => ({ ...s, [shopId]: "done" }));
    }
  };

  return (
    <section className="card">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <h3>Shop Applications</h3>
          <p className="muted-text">
            Approving keeps services live; rejecting will auto-deactivate all related services.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="pending">Pending only</option>
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p>Loading applications…</p> : null}

      <div className="provider-table-wrap">
        <table className="provider-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Owner</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((shop) => {
              const badge = statusBadge(shop.status);
              const state = actionState[shop._id];
              return (
                <tr key={shop._id}>
                  <td>
                    <div><strong>{shop.shopName}</strong></div>
                    <div className="muted-text">{shop.description}</div>
                    <div className="muted-text">{shop.address?.city || "City"}</div>
                  </td>
                  <td>
                    <div>{shop.ownerId?.name}</div>
                    <div className="muted-text">{shop.ownerId?.email}</div>
                  </td>
                  <td>{shop.industry?.name || "–"}</td>
                  <td>
                    <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
                    {shop.statusMeta?.reason ? (
                      <div className="muted-text">Reason: {shop.statusMeta.reason}</div>
                    ) : null}
                  </td>
                  <td>{new Date(shop.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="provider-action-row">
                      <button
                        className="btn btn-small"
                        disabled={state === "pending" || shop.status !== "pending"}
                        onClick={() => handleApprove(shop._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        disabled={state === "pending" || shop.status !== "pending"}
                        onClick={() => handleReject(shop._id)}
                      >
                        Reject
                      </button>
                    </div>
                    {shop.status === "pending" ? (
                      <div className="form-field" style={{ marginTop: 6 }}>
                        <label className="muted-text">Rejection reason (optional)</label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. missing license documents"
                        />
                      </div>
                    ) : (
                      <div className="muted-text" style={{ marginTop: 6 }}>
                        Services are {shop.status === "approved" ? "active" : "deactivated"}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
