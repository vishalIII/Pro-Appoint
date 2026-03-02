import { Can } from "../rbac";

export default function AdminDashboard() {
  return (
    <section className="card">
      <h3>Admin Dashboard</h3>
      <p>Role-based actions are rendered from permission checks.</p>
      <div className="actions-row">
        <Can permission="manage_users">
          <button className="btn">Manage Users</button>
        </Can>
        <Can permission="view_all_bookings">
          <button className="btn">View All Bookings</button>
        </Can>
      </div>
    </section>
  );
}
