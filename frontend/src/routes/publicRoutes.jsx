import HomePage from "../pages/public/home/HomePage";
import About from "../pages/public/About";
import Menu from "../pages/public/Menu";
import Reviews from "../pages/public/Reviews";
import ShopDetails from "../pages/public/shop/ShopDetails";
import ServiceDetails from "../pages/public/service/ServiceDetails";
import ServicesPage from "../pages/public/service/ServicesPage";
import Subscription from "../pages/payment_transactions/subscription";
import Login from "../pages/Login";
import Register from "../pages/Register";
import PlanSelection from "../pages/PlanSelection";
import Unauthorized from "../pages/Unauthorized";

export const publicRoutes = [
  { index: true, element: <HomePage /> },
  { path: "about", element: <About /> },
  { path: "menu", element: <Menu /> },
  { path: "services", element: <ServicesPage /> },
  { path: "shops/:shopId", element: <ShopDetails /> },
  { path: "shops/:shopId/services/:serviceId", element: <ServiceDetails /> },
  { path: "reviews", element: <Reviews /> },
  { path: "payment/subscription", element: <Subscription /> },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "register/plan-selection", element: <PlanSelection /> },
  { path: "unauthorized", element: <Unauthorized /> }
];

