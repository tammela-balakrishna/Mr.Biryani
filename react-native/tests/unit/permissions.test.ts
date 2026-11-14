import { hasAllPermissions, hasAnyPermission, hasPermission, isStaffSession, CUSTOMER_PERMISSIONS } from '../../src/authorization/permissions';

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

  it('uses the same permission keys as the backend catalogue', () => {
    expect(CUSTOMER_PERMISSIONS.placeOrder).toBe('orders.create_own');
    expect(CUSTOMER_PERMISSIONS.readMenu).toBe('menu.read');
  });
});
