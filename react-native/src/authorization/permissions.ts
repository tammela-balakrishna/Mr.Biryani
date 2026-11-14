// Permission helpers. The permission list comes from the server (/auth/session). These functions only decide
// which screens and buttons to show; the backend rejects any request the user is not allowed to make.

export const hasPermission = (granted: readonly string[], key: string): boolean => granted.includes(key);

export const hasAnyPermission = (granted: readonly string[], keys: readonly string[]): boolean =>
  keys.some((key) => granted.includes(key));

export const hasAllPermissions = (granted: readonly string[], keys: readonly string[]): boolean =>
  keys.every((key) => granted.includes(key));

/** True when the account holds any role other than Customer. */
export const isStaffSession = (roles: readonly string[]): boolean => roles.some((role) => role !== 'CUSTOMER');

/** Permission keys used by the customer journey. Keep in sync with backend/src/main/java/.../Permissions.java. */
export const CUSTOMER_PERMISSIONS = {
  readMenu: 'menu.read',
  placeOrder: 'orders.create_own',
  readOwnOrders: 'orders.read_own',
  manageOwnReservations: 'reservations.manage_own',
} as const;
