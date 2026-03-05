import { ROLES } from "./roles";

export const PERMISSIONS = {
  [ROLES.ADMIN]: ["manage_users", "view_all_bookings", "delete_booking"],
  [ROLES.PROVIDER]: [
    "view_own_bookings",
    "update_booking",
    "manage_services",
    "manage_resources",
    "view_revenue",
    "view_subscription",
  ],
  [ROLES.CUSTOMER]: ["create_booking", "cancel_booking"]
};

export const hasPermissionForRole = (role, permission) =>
  PERMISSIONS[role]?.includes(permission) || false;
