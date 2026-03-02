import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="page-block home-stack">
      <div className="card">
        <h1>User Access Flow</h1>
        <p>Public users can browse shops and services. Booking and account actions require login.</p>
        <div className="cta-links">
          <Link className="btn" to="/shops">
            Browse Shops
          </Link>
          <Link className="btn btn-secondary" to="/menu">
            View Menu
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Flow Summary</h2>
        <ol className="flow-list">
          <li>Public user: can access About, Menu, Shops, Reviews, Shop details and Service details.</li>
          <li>Logged-in customer: can book appointments and manage bookings.</li>
          <li>Tenant/Admin: protected routes and APIs require role-based login.</li>
        </ol>
      </div>
    </section>
  );
}
