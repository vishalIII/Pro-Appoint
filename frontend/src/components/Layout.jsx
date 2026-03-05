import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ROLES } from "../rbac";

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTenantRoute = location.pathname.startsWith("/tenant");
  const canUseListBusiness = !isAuthenticated || user?.role === ROLES.CUSTOMER;
  const navLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/menu", label: "Shop" },
    { to: "/about", label: "About" }
  ];

  const handleListBusiness = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { redirectTo: "/provider/apply" } });
      return;
    }

    if (user?.role !== ROLES.CUSTOMER) {
      navigate("/unauthorized");
      return;
    }

    navigate("/provider/apply");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (isTenantRoute) {
    return (
      <div className="app-shell tenant-app-shell">
        <main className="tenant-page-shell">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-info-wrap">
          <div className="header-container header-info">
            <div className="header-info-left">
              <span>hello@freshmart.com</span>
              <span>Free shipping for all orders over $99</span>
            </div>
            <div className="header-info-right">
              <span>EN</span>
              <span>USD</span>
            </div>
          </div>
        </div>

        <div className="header-main-wrap">
          <div className="header-container header-main">
            <Link to="/" className="brand-logo" aria-label="Pro appoint home">
              Pro<span>Appoint</span>
            </Link>

            <nav className="header-nav">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `header-nav-link${isActive ? " is-active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="header-actions">
              {isAuthenticated ? (
                <button style={{color:"red"}} type="button" className="auth-action" onClick={handleLogout}>
                  Log out
                </button>
              ) : (
                <Link to="/login" className="auth-action">
                  Log in
                </Link>
              )}
              {canUseListBusiness ? (
                <button type="button" className="list-business-btn" onClick={handleListBusiness}>
                  List your business
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
