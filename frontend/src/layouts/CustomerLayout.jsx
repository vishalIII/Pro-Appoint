import { Link, Outlet } from "react-router-dom";

const CustomerLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <h2>Customer Panel</h2>
        <nav className="dashboard-nav">
          <Link to="/">Overview</Link>
          <Link to="/bookings">My Bookings</Link>
        </nav>
      </header>
      <Outlet />
    </section>
  );
};

export default CustomerLayout;
