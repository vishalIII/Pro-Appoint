import { Link, Outlet } from "react-router-dom";

const CustomerLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <h2>Customer Panel</h2>
        <nav className="dashboard-nav">
          <Link to="/customer">Overview</Link>
          <Link to="/customer/bookings">My Bookings</Link>
          <Link to="/shops">Browse Shops</Link>
        </nav>
      </header>
      <Outlet />
    </section>
  );
};

export default CustomerLayout;
