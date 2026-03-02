import { useAuthorization } from "../rbac";

export const usePermission = () => {
  const { can } = useAuthorization();

  return {
    hasPermission: can
  };
};
