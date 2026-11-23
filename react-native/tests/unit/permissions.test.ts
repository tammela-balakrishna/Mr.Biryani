import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isStaffSession,
  CUSTOMER_PERMISSIONS,
  getPrimaryRole,
  getPrimaryStaffTab,
  SYSTEM_DEFAULTS,
  canAccessStaffTab,
} from '../../src/authorization/permissions';

describe('permission helpers', () => {
  const granted = ['menu.read', 'orders.create_own'];

  it('checks single and any/all permissions against the server list', () => {
    expect(hasPermission(granted, 'menu.read')).toBe(true);
    expect(hasPermission(granted, 'roles.manage')).toBe(false);
    expect(hasAnyPermission(granted, ['roles.manage', 'orders.create_own'])).toBe(true);
    expect(hasAllPermissions(granted, ['menu.read', 'roles.manage'])).toBe(false);
  });

  it('treats any non-customer role as staff', () => {
    expect(isStaffSession(['CUSTOMER'])).toBe(false);
    expect(isStaffSession(['CUSTOMER', 'WAITER'])).toBe(true);
    expect(isStaffSession([])).toBe(false);
  });

  it('resolves primary roles and tabs according to seniority hierarchy', () => {
    expect(getPrimaryRole(['WAITER', 'CAPTAIN'])).toBe('CAPTAIN');
    expect(getPrimaryRole(['MANAGER', 'ADMIN'])).toBe('ADMIN');
    expect(getPrimaryRole(['WAITER'])).toBe('WAITER');
    expect(getPrimaryRole(['CUSTOMER'])).toBe('CUSTOMER');

    expect(getPrimaryStaffTab(['WAITER'])).toBe('staff-orders');
    expect(getPrimaryStaffTab(['CAPTAIN'])).toBe('floor');
    expect(getPrimaryStaffTab(['CASHIER'])).toBe('cashier');
    expect(getPrimaryStaffTab(['MANAGER'])).toBe('manager');
  });

  it('uses the same permission keys as the backend catalogue', () => {
    expect(CUSTOMER_PERMISSIONS.placeOrder).toBe('orders.create_own');
    expect(CUSTOMER_PERMISSIONS.readMenu).toBe('menu.read');
    expect(SYSTEM_DEFAULTS.WAITER).toContain('orders.send_to_kitchen');
    expect(SYSTEM_DEFAULTS.CASHIER).toContain('billing.generate');
    expect(SYSTEM_DEFAULTS.CASHIER).not.toContain('reservations.read');
  });

  it('strictly hides reception and floor from cashier, matching webapp dashboards', () => {
    const cashierPerms = SYSTEM_DEFAULTS.CASHIER;

    // Cashier must ONLY see Cashier till and Orders
    expect(canAccessStaffTab('cashier', ['CASHIER'], cashierPerms)).toBe(true);
    expect(canAccessStaffTab('staff-orders', ['CASHIER'], cashierPerms)).toBe(true);

    // Cashier must NEVER see Reception Desk, Floor supervision, Manager, or Reports
    expect(canAccessStaffTab('reception', ['CASHIER'], cashierPerms)).toBe(false);
    expect(canAccessStaffTab('floor', ['CASHIER'], cashierPerms)).toBe(false);
    expect(canAccessStaffTab('manager', ['CASHIER'], cashierPerms)).toBe(false);
    expect(canAccessStaffTab('reports', ['CASHIER'], cashierPerms)).toBe(false);
  });

  it('strictly limits waiter and receptionist to their operational scopes', () => {
    const waiterPerms = SYSTEM_DEFAULTS.WAITER;
    expect(canAccessStaffTab('floor', ['WAITER'], waiterPerms)).toBe(true);
    expect(canAccessStaffTab('staff-orders', ['WAITER'], waiterPerms)).toBe(true);
    expect(canAccessStaffTab('cashier', ['WAITER'], waiterPerms)).toBe(false);
    expect(canAccessStaffTab('reception', ['WAITER'], waiterPerms)).toBe(false);

    const receptionistPerms = SYSTEM_DEFAULTS.RECEPTIONIST;
    expect(canAccessStaffTab('reception', ['RECEPTIONIST'], receptionistPerms)).toBe(true);
    expect(canAccessStaffTab('floor', ['RECEPTIONIST'], receptionistPerms)).toBe(true);
    expect(canAccessStaffTab('cashier', ['RECEPTIONIST'], receptionistPerms)).toBe(false);
    expect(canAccessStaffTab('staff-orders', ['RECEPTIONIST'], receptionistPerms)).toBe(false);
  });
});
