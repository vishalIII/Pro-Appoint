import { Link, Outlet } from "react-router-dom";

const CustomerLayout = () => {
  return (
    <div>
      <h2>Customer Panel</h2>
      <nav>
        <Link to="/customer">Dashboard</Link>
        <Link to="/home">home</Link>
      </nav>
      <Outlet />
    </div>
  );
};

export default CustomerLayout;
