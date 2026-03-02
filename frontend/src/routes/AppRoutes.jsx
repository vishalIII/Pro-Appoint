import { Route, Routes } from "react-router-dom";
import { AccessGuard } from "../rbac";
import { routeConfig } from "./routeConfig";

const renderRoute = (route, indexKey) => {
  const { guard, children, element, index, path } = route;

  const wrappedElement = guard ? (
    <AccessGuard roles={guard.roles} permission={guard.permission}>
      {element}
    </AccessGuard>
  ) : (
    element
  );

  const routeProps = index ? { index: true } : { path };
  const key = route.key || (index ? `index-${indexKey}` : path || `route-${indexKey}`);

  return (
    <Route key={key} {...routeProps} element={wrappedElement}>
      {children?.map((child, childIndex) => renderRoute(child, `${indexKey}-${childIndex}`))}
    </Route>
  );
};

export default function AppRoutes() {
  return <Routes>{routeConfig.map((route, index) => renderRoute(route, index))}</Routes>;
}
