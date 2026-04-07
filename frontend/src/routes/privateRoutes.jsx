import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { ROLES } from "../rbac";

const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const ProviderLayout = lazy(() => import("../layouts/ProviderLayout"));
const CustomerLayout = lazy(() => import("../layouts/CustomerLayout"));

const AdminDashboard = lazy(() => import("../dashboards/AdminDashboard"));
const ShopApplicationsPage = lazy(() => import("../pages/admin/ShopApplications"));
const IndustryManagerPage = lazy(() => import("../pages/admin/IndustryManager"));
const TenantApplicationsPage = lazy(() => import("../pages/admin/TenantApplications"));

const ProviderDashboard = lazy(() => import("../dashboards/ProviderDashboard"));
const CustomerDashboard = lazy(() => import("../dashboards/CustomerDashboard"));

const BookingFlow = lazy(() => import("../pages/customer/BookingFlow"));
const MyBookings = lazy(() => import("../pages/customer/MyBookings"));
const ApplyProvider = lazy(() => import("../pages/provider/ApplyProvider"));

const ProviderAppointmentsPage = lazy(() => import("../pages/serviceProvider/Appointments"));
const ProviderShopsPage = lazy(() => import("../pages/serviceProvider/Shops"));
const ProviderServicesPage = lazy(() => import("../pages/serviceProvider/Services"));
const ProviderResourcesPage = lazy(() => import("../pages/serviceProvider/Resources"));
const ProviderRevenuePage = lazy(() => import("../pages/serviceProvider/Revenue"));
const ProviderReviewsPage = lazy(() => import("../pages/serviceProvider/Reviews"));
const ProviderSubscriptionPage = lazy(() => import("../pages/serviceProvider/Subscription"));
const ProviderSettingsPage = lazy(() => import("../pages/serviceProvider/Settings"));
const ProviderCreateShopPage = lazy(() => import("../pages/serviceProvider/CreateShop"));
const ProviderNotificationsPage = lazy(() => import("../pages/serviceProvider/Notifications"));

const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const MeetingPage = lazy(() => import("../pages/MeetingPage"));

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
  path: "meeting/:appointmentId",
  element: <MeetingPage />,
  guard: { roles: [ROLES.CUSTOMER, ROLES.PROVIDER] }
},
  {
    path: "",
    element: <CustomerLayout />,
    guard: { roles: [ROLES.CUSTOMER] },
    children: [
      { index: true, element: <CustomerDashboard /> },
      { path: "bookings", element: <MyBookings /> },
      { path: "notifications", element: <NotificationsPage /> },
    ]
  },
  {
    path: "tenant",
    element: <ProviderLayout />,
    guard: { roles: [ROLES.PROVIDER] },
    children: [
      { index: true, element: <ProviderDashboard /> },
      { path: "appointments", element: <ProviderAppointmentsPage /> },
      { path: "notifications", element: <ProviderNotificationsPage /> },
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
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "shops", element: <ShopApplicationsPage /> },
      { path: "industries", element: <IndustryManagerPage /> },
      { path: "tenants", element: <TenantApplicationsPage /> }
    ]
  }
];
