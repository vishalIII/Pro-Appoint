import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <section className="card">
      <h3>Admin Overview</h3>
      <p className="muted-text">Quick links to core review workflows.</p>
      <div className="actions-row">
        <Link className="btn" to="/admin/shops">
          Review Shop Applications
        </Link>
        <Link className="btn" to="/admin/industries">
          Manage Industries
        </Link>
        <Link className="btn" to="/admin/tenants">
          Tenant Applications
        </Link>
      </div>
    </section>
  );
}
