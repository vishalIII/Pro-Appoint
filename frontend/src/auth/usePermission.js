import { useAuth } from "./useAuth";
import { PERMISSIONS } from "./permissions";

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!user) return false;
    return PERMISSIONS[user.role]?.includes(permission);
  };

  return { hasPermission };
};