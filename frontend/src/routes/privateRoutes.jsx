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
import ProviderAppointmentsPage from "../pages/serviceProvider/Appointments";
import ProviderShopsPage from "../pages/serviceProvider/Shops";
import ProviderServicesPage from "../pages/serviceProvider/Services";
import ProviderResourcesPage from "../pages/serviceProvider/Resources";
import ProviderRevenuePage from "../pages/serviceProvider/Revenue";
import ProviderReviewsPage from "../pages/serviceProvider/Reviews";
import ProviderSubscriptionPage from "../pages/serviceProvider/Subscription";
import ProviderSettingsPage from "../pages/serviceProvider/Settings";
import ProviderCreateShopPage from "../pages/serviceProvider/CreateShop";
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
    children: [
      { index: true, element: <ProviderDashboard /> },
      { path: "appointments", element: <ProviderAppointmentsPage /> },
      { path: "shops/create", element: <ProviderCreateShopPage /> },
      { path: "shops/:shopId/services", element: <ProviderServicesPage /> },
      { path: "shops/:shopId/resources", element: <ProviderResourcesPage /> },
      { path: "shops", element: <ProviderShopsPage /> },
      { path: "services", element: <ProviderServicesPage /> },
      { path: "resources", element: <ProviderResourcesPage /> },
      { path: "revenue", element: <ProviderRevenuePage /> },
      { path: "reviews", element: <ProviderReviewsPage /> },
      { path: "subscription", element: <ProviderSubscriptionPage /> },
      { path: "settings", element: <ProviderSettingsPage /> }
    ]
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
