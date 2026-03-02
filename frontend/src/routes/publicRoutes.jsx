import Home from "../pages/public/Home";
import About from "../pages/public/About";
import Menu from "../pages/public/Menu";
import Reviews from "../pages/public/Reviews";
import Shops from "../pages/public/shop/ShopsPage";
import ShopDetails from "../pages/public/shop/ShopDetails";
import ServiceDetails from "../pages/public/ServiceDetails";
import Subscription from "../pages/payment_transactions/subscription";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Unauthorized from "../pages/Unauthorized";

export const publicRoutes = [
  { index: true, element: <Home /> },
  { path: "about", element: <About /> },
  { path: "menu", element: <Menu /> },
  { path: "shops", element: <Shops /> },
  { path: "shops/:shopId", element: <ShopDetails /> },
  { path: "shops/:shopId/services/:serviceId", element: <ServiceDetails /> },
  { path: "reviews", element: <Reviews /> },
  { path: "payment/subscription", element: <Subscription /> },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "unauthorized", element: <Unauthorized /> }
];
