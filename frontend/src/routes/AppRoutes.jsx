import { Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Unauthorized from "../pages/Unauthorized";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import AdminLayout from "../layouts/AdminLayout";
import ProviderLayout from "../layouts/ProviderLayout";
import CustomerLayout from "../layouts/CustomerLayout";
import AdminDashboard from "../dashboards/AdminDashboard";
import ProviderDashboard from "../dashboards/ProviderDashboard";
import CustomerDashboard from "../dashboards/CustomerDashboard";
import { ROLES } from "../auth/permissions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route
          path="/provider"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.PROVIDER]}>
                <ProviderLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<ProviderDashboard />} />
        </Route>

        <Route
          path="/customer"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
