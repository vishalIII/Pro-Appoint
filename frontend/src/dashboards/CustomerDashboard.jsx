import { Link } from "react-router-dom";
import { Can } from "../rbac";

export default function CustomerDashboard() {
  return (
    <section className="card">
      <h3>Customer Dashboard</h3>
      <p>You can book services and manage your appointments here.</p>
      <div className="actions-row">
        <Can permission="create_booking">
          <Link className="btn" to="/shops">
            Book Service
          </Link>
        </Can>
        <Can permission="cancel_booking">
          <Link className="btn btn-secondary" to="/customer/bookings">
            Manage Bookings
          </Link>
        </Can>
      </div>
    </section>
  );
}
