import { useEffect, useState } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", isSidebarOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isSidebarOpen]);

  return (
    <section className="provider-workspace">
      <aside className={`provider-sidebar${isSidebarOpen ? " is-open" : ""}`}>
        <div className="provider-sidebar-inner">
          <div className="provider-sidebar-header">
            <span className="provider-sidebar-title">Menu</span>
            <button
              type="button"
              className="provider-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              ×
            </button>
          </div>

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
                onClick={closeSidebar}
                className={({ isActive }) =>
                  isActive ? "provider-nav-link is-active" : "provider-nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="provider-sidebar-footer">
            <button
              type="button"
              className="provider-logout-btn"
              onClick={() => {
                closeSidebar();
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="provider-main">
        <header className="provider-topbar provider-topbar-compact">
          <div className="provider-topbar-left">
            <button
              type="button"
              className="provider-sidebar-toggle"
              aria-label="Toggle sidebar"
              aria-expanded={isSidebarOpen}
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <div className="provider-topbar-title">Admin workspace</div>
          </div>
        </header>
        <Outlet />
      </div>

      {isSidebarOpen ? (
        <button
          type="button"
          className="provider-sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      ) : null}
    </section>
  );
}
