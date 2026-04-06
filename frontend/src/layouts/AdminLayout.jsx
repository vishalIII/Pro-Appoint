import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const adminNav = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/shops", label: "Shops" },
  { to: "/admin/industries", label: "Industries" },
  { to: "/admin/tenants", label: "Tenants" },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <section className="provider-workspace">
      <aside className="provider-sidebar">
        <div className="provider-sidebar-inner">
          <div className="provider-brand">
            <NavLink to="/admin" className="provider-sidebar-logo" aria-label="Admin dashboard">
              Pro<span>Appoint</span>
            </NavLink>
            <p>Platform operations</p>
          </div>

          <nav className="provider-nav">
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "provider-nav-link is-active" : "provider-nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="provider-sidebar-footer">
            <button type="button" className="provider-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="provider-main">
        <Outlet />
      </div>
    </section>
  );
}
