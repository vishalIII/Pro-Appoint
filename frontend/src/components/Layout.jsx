import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ROLES } from "../rbac";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isTenantRoute = location.pathname.startsWith("/tenant");
  const isAdminRoute = location.pathname.startsWith("/admin");
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

  // useEffect(() => {
  //   setIsMenuOpen(false);
  // }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", isMenuOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  if (isTenantRoute || isAdminRoute) {
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
            <div className="header-brand-row">
              <Link to="/" className="brand-logo" aria-label="Pro appoint home">
                Pro<span>Appoint</span>
              </Link>

              <button
                type="button"
                className={`header-menu-btn${isMenuOpen ? " is-active" : ""}`}
                aria-expanded={isMenuOpen}
                aria-controls="site-navigation"
                onClick={toggleMenu}
              >
                <span className="sr-only">Toggle navigation</span>
                <span />
                <span />
                <span />
              </button>
            </div>

            <div
              id="site-navigation"
              className={`header-mobile-panel${isMenuOpen ? " is-open" : ""}`}
            >
              <div className="header-mobile-top">
                <span className="header-mobile-label">Menu</span>
                <button
                  type="button"
                  className="header-menu-close"
                  onClick={closeMenu}
                  aria-label="Close navigation"
                >
                  ×
                </button>
              </div>

              <nav className="header-nav">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={closeMenu}
                    className={({ isActive }) => `header-nav-link${isActive ? " is-active" : ""}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="header-actions">
                {isAuthenticated && user?.role === ROLES.CUSTOMER ? (
                  <Link to="/bookings" className="auth-action" onClick={closeMenu}>
                    My appointments
                  </Link>
                ) : null}
                {isAuthenticated && <NotificationBell />}
                {isAuthenticated ? (
                  <button
                    style={{ color: "red" }}
                    type="button"
                    className="auth-action"
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                  >
                    Log out
                  </button>
                ) : (
                  <Link to="/login" className="auth-action" onClick={closeMenu}>
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
        </div>
      </header>

      {isMenuOpen ? (
        <button type="button" className="header-panel-backdrop" onClick={closeMenu}>
          <span className="sr-only">Close navigation</span>
        </button>
      ) : null}

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
