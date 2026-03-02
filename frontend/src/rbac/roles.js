export const ROLES = {
  ADMIN: "Admin",
  PROVIDER: "ServiceProvider",
  CUSTOMER: "Customer"
};

export const ROLE_DASHBOARD_PATHS = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.PROVIDER]: "/tenant",
  [ROLES.CUSTOMER]: "/customer"
};

export const getDashboardPathForRole = (role) => ROLE_DASHBOARD_PATHS[role] || "/";
