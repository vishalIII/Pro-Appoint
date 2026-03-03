import { Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ProviderLayout from "../layouts/ProviderLayout";
import CustomerLayout from "../layouts/CustomerLayout";
import AdminDashboard from "../dashboards/AdminDashboard";
import ProviderDashboard from "../dashboards/ProviderDashboard";
import CustomerDashboard from "../dashboards/CustomerDashboard";
import BookingFlow from "../pages/customer/BookingFlow";
import MyBookings from "../pages/customer/MyBookings";
import ApplyProvider from "../pages/provider/ApplyProvider";
import { ROLES } from "../rbac";

export const privateRoutes = [
  {
    path: "shops/:shopId/services/:serviceId/book",
    element: <BookingFlow />,
    guard: { roles: [ROLES.CUSTOMER] }
  },
  {
    path: "provider/apply",
    element: <ApplyProvider />,
    guard: { roles: [ROLES.CUSTOMER] }
  },
  {
    path: "customer",
    element: <CustomerLayout />,
    guard: { roles: [ROLES.CUSTOMER] },
    children: [
      { index: true, element: <CustomerDashboard /> },
      { path: "bookings", element: <MyBookings /> }
    ]
  },
  {
    path: "tenant",
    element: <ProviderLayout />,
    guard: { roles: [ROLES.PROVIDER] },
    children: [{ index: true, element: <ProviderDashboard /> }]
  },
  {
    path: "provider",
    element: <Navigate to="/tenant" replace />,
    guard: { roles: [ROLES.PROVIDER] }
  },
  {
    path: "admin",
    element: <AdminLayout />,
    guard: { roles: [ROLES.ADMIN] },
    children: [{ index: true, element: <AdminDashboard /> }]
  }
];
