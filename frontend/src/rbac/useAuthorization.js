import { useMemo } from "react";
import { useAuth } from "../auth/useAuth";
import { hasPermissionForRole } from "./permissions";

export const useAuthorization = () => {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role || null;

    return {
      role,
      can: (permission) => {
        if (!role) return false;
        return hasPermissionForRole(role, permission);
      },
      hasRole: (allowedRoles) => {
        if (!role) return false;
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
        return allowedRoles.includes(role);
      }
    };
  }, [user]);
};
