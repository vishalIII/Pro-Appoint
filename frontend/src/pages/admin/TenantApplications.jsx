import { useEffect, useState } from "react";
import { fetchTenantApplications } from "../../api/adminApi";

export default function TenantApplicationsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTenantApplications();
      setTenants(data);
    } catch (err) {
      setError(err.message || "Failed to load tenant applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <h3>Tenant Applications</h3>
          <p className="muted-text">Applicants who selected a subscription plan.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <div className="provider-table-wrap">
        <table className="provider-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant._id}>
                <td>
                  <div><strong>{tenant.ownerId?.name || "N/A"}</strong></div>
                  <div className="muted-text">{tenant.ownerId?.email}</div>
                </td>
                <td>{tenant.plan}</td>
                <td>
                  <span className={`badge badge-${tenant.isActive ? "green" : "red"}`}>
                    {tenant.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

