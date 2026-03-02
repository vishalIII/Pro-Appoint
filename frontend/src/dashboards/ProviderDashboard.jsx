import { Can } from "../rbac";

export default function ProviderDashboard() {
  return (
    <section className="card">
      <h3>Provider Dashboard</h3>
      <p>Only provider-specific permissions unlock these actions.</p>
      <div className="actions-row">
        <Can permission="view_own_bookings">
          <button className="btn">My Bookings</button>
        </Can>
        <Can permission="update_booking">
          <button className="btn">Update Booking</button>
        </Can>
      </div>
    </section>
  );
}
