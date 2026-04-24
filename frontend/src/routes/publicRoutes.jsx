import { lazy } from "react";

const HomePage = lazy(() => import("../pages/public/home/HomePage"));
const About = lazy(() => import("../pages/public/About"));
const Menu = lazy(() => import("../pages/public/Menu"));
const Reviews = lazy(() => import("../pages/public/Reviews"));
const ShopDetails = lazy(() => import("../pages/public/shop/ShopDetails"));
const ShopByCategory = lazy(() => import("../pages/public/shop/ShopByCategory"));
const ServiceDetails = lazy(() => import("../pages/public/service/ServiceDetails"));
const ServicesPage = lazy(() => import("../pages/public/service/ServicesPage"));
const Subscription = lazy(() => import("../pages/payment_transactions/subscription"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const PlanSelection = lazy(() => import("../pages/PlanSelection"));
const Unauthorized = lazy(() => import("../pages/Unauthorized"));
const VerifyOtp = lazy(() => import("../pages/VerifyOtp"));

export const publicRoutes = [
  { index: true, element: <HomePage /> },
  { path: "about", element: <About /> },
  { path: "menu", element: <Menu /> },
  { path: "services", element: <ServicesPage /> },
  { path: "shops/:shopId", element: <ShopDetails /> },
  { path: "shops/:shopId/services/:serviceId", element: <ServiceDetails /> },
  { path: "shops/by-category/:category", element: <ShopByCategory /> },
  { path: "reviews", element: <Reviews /> },
  { path: "payment/subscription", element: <Subscription /> },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "verify-otp", element: <VerifyOtp /> },
  { path: "plan-selection", element: <PlanSelection /> },
  { path: "unauthorized", element: <Unauthorized /> }
];
