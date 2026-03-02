import Layout from "../components/Layout";
import NotFound from "../pages/NotFound";
import { publicRoutes } from "./publicRoutes";
import { privateRoutes } from "./privateRoutes";

export const routeConfig = [
  {
    path: "/",
    element: <Layout />,
    children: [...publicRoutes, ...privateRoutes, { path: "*", element: <NotFound /> }]
  }
];
