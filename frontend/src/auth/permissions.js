export const ROLES = {
  ADMIN: "Admin",
  PROVIDER: "ServiceProvider",
  CUSTOMER: "Customer"
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: ["manage_users", "view_all_bookings", "delete_booking"],
  [ROLES.PROVIDER]: ["view_own_bookings", "update_booking"],
  [ROLES.CUSTOMER]: ["create_booking", "cancel_booking"]
};

export const getDashboardPathForRole = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.PROVIDER:
      return "/provider";
    case ROLES.CUSTOMER:
      return "/customer";
    default:
      return "/";
  }
};
