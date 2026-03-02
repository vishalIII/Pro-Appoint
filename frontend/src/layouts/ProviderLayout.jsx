import { Link, Outlet } from "react-router-dom";

const ProviderLayout = () => {
  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <h2>Tenant Panel</h2>
        <nav className="dashboard-nav">
          <Link to="/tenant">Overview</Link>
        </nav>
      </header>
      <Outlet />
    </section>
  );
};

export default ProviderLayout;
