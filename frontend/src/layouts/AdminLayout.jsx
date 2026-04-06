import { Link, Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <h2>Admin Panel</h2>
        <nav className="dashboard-nav">
          <Link to="/admin">Overview</Link>
          <Link to="/admin/shops">Shops</Link>
          <Link to="/admin/industries">Industries</Link>
          <Link to="/admin/tenants">Tenants</Link>
        </nav>
      </header>
      <Outlet />
    </section>
  );
};

export default AdminLayout;
