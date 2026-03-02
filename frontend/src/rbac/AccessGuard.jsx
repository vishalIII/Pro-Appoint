import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useAuthorization } from "./useAuthorization";

const AccessGuard = ({ children, roles, permission }) => {
  const { isAuthenticated } = useAuth();
  const { hasRole, can } = useAuthorization();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default AccessGuard;
