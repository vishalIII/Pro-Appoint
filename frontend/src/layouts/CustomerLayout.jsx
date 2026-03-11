import { Link, Outlet } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";

const CustomerLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div className="customer-header-main">
          <h2>Customer Panel</h2>
          <nav className="dashboard-nav">
            <Link to="/">Overview</Link>
            <Link to="/bookings">My Bookings</Link>
            <Link to="/notifications">Notifications</Link>
          </nav>
        </div>
        <div className="dashboard-header-actions">
          <NotificationBell />
        </div>
      </header>
      <Outlet />
    </section>
  );
};

export default CustomerLayout;
