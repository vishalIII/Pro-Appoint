import { Link, Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <h2>Admin Panel</h2>
        <nav className="dashboard-nav">
          <Link to="/admin">Overview</Link>
        </nav>
      </header>
      <Outlet />
    </section>
  );
};

export default AdminLayout;
