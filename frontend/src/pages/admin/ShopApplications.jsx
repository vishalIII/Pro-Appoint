import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveShopApplication,
  fetchShopApplications,
  rejectShopApplication,
  suspendShop,
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
  const [selectedShop, setSelectedShop] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

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
      setSelectedShop(null);
      setDrawerOpen(false);
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
      setSelectedShop(null);
      setDrawerOpen(false);
    } catch (err) {
      setActionState((s) => ({ ...s, [shopId]: "error" }));
      setError(err.message || "Reject failed");
    } finally {
      setActionState((s) => ({ ...s, [shopId]: "done" }));
    }
  };

  const handleSuspend = async (shopId) => {
    const reason = suspendReason.trim();
    setActionState((s) => ({ ...s, [shopId]: "pending" }));
    try {
      await suspendShop({ shopId, reason });
      await load();
      setSuspendReason("");
      setSelectedShop(null);
      setDrawerOpen(false);
    } catch (err) {
      setActionState((s) => ({ ...s, [shopId]: "error" }));
      setError(err.message || "Suspend failed");
    } finally {
      setActionState((s) => ({ ...s, [shopId]: "done" }));
    }
  };

  const openDrawer = (shop) => {
    setSelectedShop(shop);
    setDrawerOpen(true);
    setRejectReason("");
    setSuspendReason("");
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedShop(null);
    setPreviewUrl("");
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((shop) => {
              const badge = statusBadge(shop.status);
              return (
                <tr
                  key={shop._id}
                  className="clickable-row"
                  onClick={() => openDrawer(shop)}
                >
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drawerOpen && selectedShop ? (
        <ShopDrawer
          shop={selectedShop}
          onClose={closeDrawer}
          onApprove={() => {
            if (window.confirm("Approve this shop and keep services active?")) {
              handleApprove(selectedShop._id);
            }
          }}
          onReject={() => {
            if (window.confirm("Reject this shop? Services will deactivate.")) {
              handleReject(selectedShop._id);
            }
          }}
          onSuspend={() => {
            if (window.confirm("Suspend this shop? Services will deactivate.")) {
              handleSuspend(selectedShop._id);
            }
          }}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          suspendReason={suspendReason}
          setSuspendReason={setSuspendReason}
          actionState={actionState[selectedShop._id]}
          previewUrl={previewUrl}
          setPreviewUrl={setPreviewUrl}
        />
      ) : null}
    </section>
  );
}

const fieldRow = (label, value) => (
  <div className="detail-row">
    <div className="detail-label">{label}</div>
    <div className="detail-value">{value || "—"}</div>
  </div>
);

function ShopDrawer({
  shop,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  rejectReason,
  setRejectReason,
  suspendReason,
  setSuspendReason,
  actionState,
  previewUrl,
  setPreviewUrl,
}) {
  const badge = statusBadge(shop.status);
  const isPending = shop.status === "pending";
  const isApproved = shop.status === "approved";
  const isBlocked = shop.status === "blocked";

  const docs = [
    { label: "GST", value: shop.documents?.gst },
    { label: "License", value: shop.documents?.license },
    ...(Array.isArray(shop.documents?.other)
      ? shop.documents.other.map((d, idx) => ({ label: `Other ${idx + 1}`, value: d }))
      : []),
  ].filter((d) => d.value);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Shop details"
      >
        <div className="drawer-header">
          <div>
            <h3>{shop.shopName}</h3>
            <div className={`badge badge-${badge.tone}`}>{badge.label}</div>
          </div>
          <button className="btn btn-secondary btn-small" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawer-section">
          {fieldRow("Description", shop.description)}
          {fieldRow("Industry", shop.industry?.name)}
          {fieldRow("Owner", `${shop.ownerId?.name || ""} (${shop.ownerId?.email || "n/a"})`)}
          {fieldRow("Tenant Plan", shop.tenantId?.plan)}
          {fieldRow("Status Reason", shop.statusMeta?.reason)}
          {fieldRow("Contact Email", shop.contactEmail)}
          {fieldRow("Contact Phone", shop.contactPhone)}
          {fieldRow("Address", [shop.address?.street, shop.address?.city, shop.address?.state, shop.address?.pincode].filter(Boolean).join(", "))}
          {fieldRow("Created", new Date(shop.createdAt).toLocaleString())}
        </div>

        <div className="drawer-section">
          <h4>Images</h4>
          <div className="thumb-grid">
            {(shop.images || []).map((src, idx) => (
              <button
                key={idx}
                className="thumb"
                onClick={() => setPreviewUrl(src)}
                aria-label="Preview image"
              >
                <img src={src} alt={`Shop ${idx + 1}`} loading="lazy" />
              </button>
            ))}
            {shop.images?.length ? null : <p className="muted-text">No images uploaded.</p>}
          </div>
        </div>

        <div className="drawer-section">
          <h4>Documents</h4>
          <ul className="doc-list">
            {docs.length === 0 ? <li className="muted-text">No documents.</li> : null}
            {docs.map((doc) => (
              <li key={`${doc.label}-${doc.value}`}>
                <a href={doc.value} target="_blank" rel="noreferrer">
                  {doc.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="drawer-actions">
          {isPending ? (
            <>
              <button
                className="btn"
                disabled={actionState === "pending"}
                onClick={onApprove}
              >
                Approve
              </button>
              <div className="form-field">
                <label>Rejection reason (optional)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. missing license"
                />
              </div>
              <button
                className="btn btn-secondary"
                disabled={actionState === "pending"}
                onClick={onReject}
              >
                Reject
              </button>
            </>
          ) : null}

          {isApproved ? (
            <>
              <div className="form-field">
                <label>Suspend reason (optional)</label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. policy violation"
                />
              </div>
              <button
                className="btn btn-secondary"
                disabled={actionState === "pending"}
                onClick={onSuspend}
              >
                Suspend
              </button>
            </>
          ) : null}

          {isBlocked ? (
            <p className="muted-text">Shop is suspended. Services are deactivated.</p>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="image-preview" onClick={() => setPreviewUrl("")}>
            <img src={previewUrl} alt="Preview" />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
