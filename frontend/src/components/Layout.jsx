import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getDashboardPathForRole, ROLES } from "../rbac";

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="nav-group">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/shops">Shops</Link>
          <Link to="/reviews">Reviews</Link>
        </div>

        <div className="nav-group nav-actions">
          {isAuthenticated ? (
            <>
              <span className="role-badge">{user?.role}</span>
              <Link to={getDashboardPathForRole(user?.role)}>Dashboard</Link>
              {user?.role === ROLES.CUSTOMER ? <Link to="/customer/bookings">My Bookings</Link> : null}
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
