// Permission helpers. The permission list comes from the server (/auth/session). These functions only decide
// which screens and buttons to show; the backend rejects any request the user is not allowed to make.

export const hasPermission = (granted: readonly string[], key: string): boolean => granted.includes(key);

export const hasAnyPermission = (granted: readonly string[], keys: readonly string[]): boolean =>
  keys.some((key) => granted.includes(key));

export const hasAllPermissions = (granted: readonly string[], keys: readonly string[]): boolean =>
  keys.every((key) => granted.includes(key));

/** True when the account holds any role other than Customer. */
export const isStaffSession = (roles: readonly string[]): boolean => roles.some((role) => role !== 'CUSTOMER');

export const hasRole = (roles: readonly string[], role: string): boolean => roles.includes(role);

/** Permission keys used by the customer journey. */
export const CUSTOMER_PERMISSIONS = {
  readMenu: 'menu.read',
  placeOrder: 'orders.create_own',
  readOwnOrders: 'orders.read_own',
  manageOwnReservations: 'reservations.manage_own',
} as const;

/** Canonical roles supported in Mr. Biryani */
export type AppRole = 'ADMIN' | 'MANAGER' | 'CAPTAIN' | 'RECEPTIONIST' | 'CASHIER' | 'WAITER' | 'CUSTOMER';

/** System default permission mappings per role matching web and backend */
export const SYSTEM_DEFAULTS: Record<AppRole, readonly string[]> = {
  CUSTOMER: [
    'menu.read',
    'customer.profile.read_own',
    'customer.profile.update_own',
    'orders.create_own',
    'orders.read_own',
    'orders.track_own',
    'reservations.manage_own',
    'bills.read_own',
    'payments.pay_own',
    'recommendations.read',
  ],
  WAITER: [
    'profile.read_own',
    'profile.update_own',
    'menu.read',
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.send_to_kitchen',
    'tables.read',
    'kitchen.orders.read',
    'service.status.read',
    'service.status.update',
  ],
  RECEPTIONIST: [
    'profile.read_own',
    'profile.update_own',
    'menu.read',
    'orders.read',
    'reservations.create',
    'reservations.read',
    'reservations.update',
    'reservations.confirm',
    'reservations.cancel',
    'reservations.check_in',
    'tables.read',
    'tables.allocate',
    'tables.transfer',
    'tables.release',
    'floor.read',
    'service.status.read',
  ],
  CAPTAIN: [
    'profile.read_own',
    'profile.update_own',
    'menu.read',
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.send_to_kitchen',
    'orders.cancel',
    'reservations.create',
    'reservations.read',
    'reservations.update',
    'reservations.confirm',
    'reservations.check_in',
    'tables.read',
    'tables.allocate',
    'tables.assign',
    'tables.transfer',
    'tables.release',
    'floor.read',
    'floor.supervise',
    'floor.assign_waiter',
    'kitchen.orders.read',
    'kitchen.orders.coordinate',
    'service.status.read',
    'service.status.update',
    'inventory.read',
  ],
  CASHIER: [
    'profile.read_own',
    'profile.update_own',
    'menu.read',
    'orders.read',
    'service.status.read',
    'billing.generate',
    'billing.read',
    'billing.split',
    'billing.reprint',
    'payments.collect',
    'payments.read',
    'payments.refund',
    'discounts.apply',
  ],
  MANAGER: [
    'profile.read_own',
    'profile.update_own',
    'menu.read',
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.send_to_kitchen',
    'orders.cancel',
    'orders.cancel.approve',
    'tables.read',
    'tables.allocate',
    'tables.assign',
    'tables.transfer',
    'tables.release',
    'reservations.create',
    'reservations.read',
    'reservations.update',
    'reservations.confirm',
    'reservations.cancel',
    'reservations.check_in',
    'floor.read',
    'floor.supervise',
    'floor.assign_waiter',
    'kitchen.orders.read',
    'kitchen.orders.coordinate',
    'service.status.read',
    'service.status.update',
    'billing.generate',
    'billing.read',
    'billing.split',
    'billing.reprint',
    'payments.collect',
    'payments.read',
    'payments.refund',
    'payments.refund.approve',
    'payments.reconcile',
    'discounts.apply',
    'discounts.approve',
    'staff.read',
    'staff.create',
    'staff.update',
    'staff.disable',
    'staff.assign_responsibility',
    'inventory.read',
    'inventory.update',
    'inventory.adjust',
    'inventory.purchase.manage',
    'expenses.read',
    'expenses.create',
    'expenses.approve',
    'feedback.read',
    'feedback.moderate',
    'reports.sales.read',
    'reports.revenue.read',
    'reports.inventory.read',
    'reports.staff_performance.read',
    'reports.export',
  ],
  ADMIN: [
    'users.manage',
    'roles.manage',
    'roles.permissions.update',
    'permissions.manage',
    'settings.manage',
    'integrations.manage',
    'security.manage',
    'chat.knowledge.read',
    'chat.knowledge.manage',
    'chat.knowledge.publish',
    'staff.read',
    'staff.create',
    'staff.update',
    'expenses.approve',
    'payments.refund.approve',
    'tables.read',
    'orders.read',
    'reports.sales.read',
  ],
};

/**
 * Returns the highest priority role in order of seniority matching the web's BY_ROLE hierarchy.
 */
export const getPrimaryRole = (roles: readonly string[]): AppRole => {
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('MANAGER')) return 'MANAGER';
  if (roles.includes('CAPTAIN')) return 'CAPTAIN';
  if (roles.includes('RECEPTIONIST')) return 'RECEPTIONIST';
  if (roles.includes('CASHIER')) return 'CASHIER';
  if (roles.includes('WAITER')) return 'WAITER';
  return 'CUSTOMER';
};

/**
 * Maps a role to its primary staff tab route in the mobile app.
 */
export const getPrimaryStaffTab = (roles: readonly string[]): string => {
  const role = getPrimaryRole(roles);
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return 'manager';
    case 'CAPTAIN':
      return 'floor';
    case 'RECEPTIONIST':
      return 'reception';
    case 'CASHIER':
      return 'cashier';
    case 'WAITER':
      return 'staff-orders';
    default:
      return 'floor';
  }
};

export type StaffTabName = 'floor' | 'staff-orders' | 'cashier' | 'reception' | 'manager' | 'reports';

/**
 * Tab access rules matching the web app dashboards:
 * - CASHIER sees only Cashier POS and Orders. Never Reception desk, Floor supervision, or Manager.
 * - WAITER sees only Floor (My Tables) and Orders. Never Reception desk, Cashier, or Manager.
 * - RECEPTIONIST sees only Reception Desk and Floor (for guest seating). Never Cashier, Orders, or Manager.
 * - CAPTAIN sees Floor, Orders, and Reception. Never Cashier or Manager.
 * - MANAGER & ADMIN see all operational workspaces.
 */
export const canAccessStaffTab = (
  tab: StaffTabName,
  roles: readonly string[],
  grantedPermissions: readonly string[] = []
): boolean => {
  const isSuper = roles.includes('ADMIN') || roles.includes('MANAGER');
  if (isSuper) return true;

  switch (tab) {
    case 'cashier':
      return (
        roles.includes('CASHIER') ||
        hasAnyPermission(grantedPermissions, ['billing.read', 'payments.collect', 'billing.generate'])
      );
    case 'reception':
      // Reception desk is STRICTLY for Receptionist, Captain, and Managers.
      // Cashier and Waiter must NEVER see Reception Desk.
      if (roles.includes('CASHIER') || roles.includes('WAITER')) {
        return false;
      }
      return (
        roles.includes('RECEPTIONIST') ||
        roles.includes('CAPTAIN') ||
        hasAnyPermission(grantedPermissions, ['reservations.confirm', 'reservations.check_in', 'reservations.create'])
      );
    case 'floor':
      // Floor turnaround & seating is for Waiters, Captains, Receptionists.
      // Cashiers do not manage floor seating or waiter assignment.
      if (roles.includes('CASHIER') && !roles.some((r) => ['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER', 'RECEPTIONIST'].includes(r))) {
        return false;
      }
      return (
        roles.includes('WAITER') ||
        roles.includes('CAPTAIN') ||
        roles.includes('RECEPTIONIST') ||
        hasPermission(grantedPermissions, 'tables.read')
      );
    case 'staff-orders':
      // Kitchen orders & serving dispatch is for Waiters, Captains, Cashiers, Managers.
      // Receptionists only handle front desk & table reservations.
      if (roles.includes('RECEPTIONIST')) {
        return false;
      }
      return (
        roles.includes('WAITER') ||
        roles.includes('CAPTAIN') ||
        roles.includes('CASHIER') ||
        hasPermission(grantedPermissions, 'orders.read')
      );
    case 'manager':
      return isSuper || hasAnyPermission(grantedPermissions, ['expenses.approve', 'staff.create', 'inventory.adjust']);
    case 'reports':
      return isSuper || hasPermission(grantedPermissions, 'reports.sales.read');
    default:
      return false;
  }
};

