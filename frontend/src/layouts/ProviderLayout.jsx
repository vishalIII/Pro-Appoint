import { Link, Outlet } from "react-router-dom";

const ProviderLayout = () => {
  return (
    <div>
      <h2>Service Provider Panel</h2>
      <nav>
        <Link to="/provider">Dashboard</Link>
      </nav>
      <Outlet />
    </div>
  );
};

export default ProviderLayout;
