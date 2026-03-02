import { useAuthorization } from "./useAuthorization";

const Can = ({ permission, role, roles, fallback = null, children }) => {
  const { role: userRole, can, hasRole } = useAuthorization();

  if (permission && !can(permission)) {
    return fallback;
  }

  if (role && userRole !== role) {
    return fallback;
  }

  if (roles && !hasRole(roles)) {
    return fallback;
  }

  return children;
};

export default Can;
