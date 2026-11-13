# Mr. BIRIYANI — Final RBAC Specification

**Status:** Approved architecture / implementation not yet started  
**Scope:** Seven predefined roles, customizable permission mappings, multi-branch-ready authorization.

## 1. Final decisions

| Decision | Final |
|---|---|
| Standard roles | Customer, Waiter, Receptionist, Captain, Cashier, Manager, Admin |
| Branch model | Single branch at launch; multi-branch ready from day one |
| Role model | Seven protected predefined roles; Admin may customize their permission mappings |
| Authorization | RBAC plus branch, ownership, assignment and business-state policies |
| Identity | One user identity may hold multiple role assignments where explicitly permitted |
| Customer registration | Public registration always creates Customer; submitted roles are ignored/rejected |
| Staff provisioning | Admin-controlled; Manager may manage operational staff only within delegated limits |
| Source of truth | PostgreSQL; frontend state and JWT claims are not authoritative permission stores |

## 2. Role definitions

| Role code | Role | Responsibility |
|---|---|---|
| CUSTOMER | Customer | Own profile, online menu, own orders, reservations, tracking, history, bills and recommendations |
| WAITER | Waiter | Assigned tables, permitted order creation/modification, kitchen dispatch and serving updates |
| RECEPTIONIST | Receptionist | Reservations, availability, guest check-in, table allocation and walk-in registration |
| CAPTAIN | Captain | Floor supervision, waiter assignment, order monitoring and service/reservation coordination |
| CASHIER | Cashier | Bill generation, payment collection, split payments, receipts and authorized refunds/cancellations |
| MANAGER | Manager | Operational staff, assignments, sales/revenue analytics, expenses, inventory and staff performance |
| ADMIN | Admin | System administration, user/role/permission management, settings, menu/pricing, tax, integrations and security |

Role codes are stable identifiers and must not be inferred from display names. The seven standard roles cannot be deleted or repurposed. Do not introduce Kitchen Manager, Inventory Manager, Accountant or generic Staff as additional standard roles; use permissions and operational assignments for those responsibilities.

## 3. Permission naming

Use stable `resource.action` keys. Examples:

- Customer: `customer.profile.read_own`, `customer.profile.update_own`, `orders.read_own`, `orders.track_own`, `reservations.manage_own`, `bills.read_own`, `recommendations.read`
- Menu: `menu.read`, `menu.create`, `menu.update`, `menu.price.update`, `menu.availability.update`
- Orders: `orders.create`, `orders.read`, `orders.update`, `orders.send_to_kitchen`, `orders.cancel`
- Tables: `tables.read`, `tables.allocate`, `tables.assign`, `tables.transfer`, `tables.release`
- Reservations: `reservations.create`, `reservations.read`, `reservations.update`, `reservations.confirm`, `reservations.cancel`, `reservations.check_in`
- Floor: `floor.read`, `floor.supervise`, `floor.assign_waiter`
- Kitchen/service: `kitchen.orders.read`, `kitchen.orders.coordinate`, `service.status.read`, `service.status.update`
- Billing: `billing.generate`, `billing.read`, `billing.split`, `billing.reprint`
- Payments: `payments.collect`, `payments.read`, `payments.refund`, `payments.refund.approve`, `payments.reconcile`
- Staff: `staff.read`, `staff.create`, `staff.update`, `staff.disable`, `staff.assign_responsibility`
- Inventory/expenses: `inventory.read`, `inventory.update`, `inventory.adjust`, `inventory.purchase.manage`, `expenses.read`, `expenses.create`, `expenses.approve`
- Reports: `reports.sales.read`, `reports.revenue.read`, `reports.inventory.read`, `reports.staff_performance.read`, `reports.export`
- Administration: `users.manage`, `roles.manage`, `roles.permissions.update`, `permissions.manage`, `settings.manage`, `integrations.manage`, `security.manage`
- Controlled operations: `discounts.apply`, `discounts.approve`, `orders.cancel.approve`

Permission keys are capabilities, not role names. Route and service authorization must reference permission keys.

## 4. Default role-permission policy

This is the baseline template. The exact permission rows are seeded and version-controlled; Admin may customize mappings. Scope restrictions still apply after a permission is granted.

| Capability | Customer | Waiter | Receptionist | Captain | Cashier | Manager | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Own profile | Own | Own | Own | Own | Own | Own | Full |
| Browse menu | Read | Read | Read | Read | Read | Full | Full |
| Menu administration | — | — | — | — | — | Limited operational | Full |
| Online orders | Own | — | Read | Manage | Billing view | Full | Full |
| POS order entry | — | Assigned | — | Manage | — | Full | Full |
| Modify orders | Own permitted | Assigned | — | Manage | Billing-safe | Full | Full |
| Kitchen dispatch | — | Assigned | — | Coordinate | — | Full | Full |
| Reservations | Own | Read | Manage | Manage permitted | Read | Full | Full |
| Walk-in/check-in | — | — | Manage | Manage | — | Full | Full |
| Table allocation | — | Assigned view | Manage | Manage | — | Full | Full |
| Waiter assignment | — | — | — | Manage | — | Full | Full |
| Serving status | Own tracking | Assigned update | Read | Manage | Read | Full | Full |
| Bill generation/split | — | — | — | — | Manage | Full | Full |
| Receipt reprint | Own bill | — | — | — | Manage | Full | Full |
| Payment collection | Own online | — | — | — | Manage | Full | Full |
| Refund | — | — | — | — | Initiate within policy | Approve within policy | Full |
| Staff accounts | — | — | — | — | — | Operational subset | Full |
| Inventory/expenses | — | — | — | Read permitted | — | Manage | Full |
| Reports | Own history | Assigned | Reservation | Floor | Payment | Full | Full |
| Roles/permissions | — | — | — | — | — | — | Full |
| Settings/security/integrations | — | — | — | — | — | — | Full |

“Full” always means within authorized branch and policy scope, not unrestricted access to every tenant or record. “Own”, “Assigned”, and “Limited” must be enforced in service/repository queries, not merely hidden in the UI.

## 5. Critical separation of duties

- Waiter may create/modify permitted orders and send them to kitchen, but cannot collect payment or issue refunds.
- Receptionist may manage bookings, check-in and table allocation, but cannot collect payment or change prices.
- Captain may supervise floor operations and assign waiters, but cannot alter security, integrations or financial configuration.
- Cashier may generate/split bills, collect payments and reprint receipts. Refund initiation and refund approval are distinct permissions; high-risk refunds require an independent authorized approver.
- Manager may manage operational staff and reports only within delegated branch scope. Manager cannot grant Admin or change role permission templates.
- Admin controls role permissions and system configuration. Admin actions must be audited; protect against removal of the last active Admin.
- Customer records are strictly self-scoped.
- Discounts, cancellations, post-payment adjustments and bill changes require explicit permission and policy checks.
- Payment success is based on verified provider/server evidence, never on a browser redirect.

## 6. Branch and resource scope

The data model is multi-branch-ready even if only one branch is initially active.

| Scope | Meaning |
|---|---|
| GLOBAL | Cross-branch system administration; Admin only |
| ASSIGNED_BRANCHES | Explicit branch assignments; Manager and other authorized staff |
| ACTIVE_BRANCH | Current selected branch, verified against server-side assignment |
| ASSIGNED_RESOURCES | Waiter's assigned tables/orders or other explicit work assignments |
| OWN_RESOURCES | Customer's own records |

Every branch-owned business record must carry `branch_id`. Every protected request validates the selected branch against current assignments. Never trust a client-supplied branch ID or token claim without checking it. Cross-branch reporting must be explicitly granted.

A user may have multiple role assignments, with branch scope attached to each assignment. Prevent ambiguous duplicate assignments with database uniqueness constraints.

## 7. Logical PostgreSQL model

- `users`: identity, normalized login identifiers, password hash, account status and authorization version.
- `roles`: seven stable role codes, display names, descriptions and system-role marker.
- `permissions`: unique permission key, module and description.
- `user_roles`: user, role, optional branch scope, active state and assignment metadata.
- `role_permissions`: role/permission mapping, unique pair, updater and timestamps.
- `branches`: branch identity, code and status.
- `user_branch_assignments`: explicit user/branch access if not fully represented by scoped `user_roles`; choose one canonical source to avoid contradictory assignments.
- `staff_table_assignments`: waiter/table/branch assignment with active period and audit metadata.
- `audit_logs`: actor, branch, action, target type/id, timestamp, request ID and safe metadata.
- Authentication support: refresh-token/session records (hashed tokens), password-reset tokens, login/rate-limit records and registered POS devices as required.

Use UUID keys, foreign keys, unique constraints, indexes on lookup/scope columns and transactional role/permission updates. Keep role-to-permission rows normalized; do not store permission lists as comma-separated text.

## 8. Authentication and authorization enforcement

Access-token JWTs are short-lived (initial target 10–15 minutes) and validate signature, allowed algorithm, issuer, audience, expiry and token identifier. Suggested claims: `sub`, `iss`, `aud`, `iat`, `exp`, `jti`, optional `sid`, `auth_version`, and selected `active_branch_id`.

JWT claims identify the principal; they are not the authoritative permission database. The API checks current account status, active role assignments, permission mappings, branch access and resource policy. Permission changes must invalidate authorization caches and take effect without waiting for access-token expiry.

Recommended request pipeline:

1. Request ID, security headers and rate limits.
2. JWT authentication and active-user validation.
3. Active branch validation.
4. Required permission check.
5. Resource ownership/assignment policy.
6. Input validation.
7. Service-layer business-state validation.
8. Transactional persistence.
9. Audit event and post-commit notifications.

Return 401 for missing/invalid authentication, 403 for authenticated but unauthorized requests, and 409 for conflicting/invalid state transitions. Use non-disclosing 404 responses where resource existence should not be revealed.

## 9. Frontend integration contract

Frontend role-aware navigation is for usability only. Every protected API request is independently authorized by the backend. Do not treat localStorage, route guards, hidden buttons or client-provided roles as security controls.

The current React prototype uses mock OTP authentication and localStorage, and currently contains generic `staff` role assumptions. It is not production authentication. Before connecting to the API:
- Replace mock authentication with the backend login/refresh/logout contract.
- Consume server-provided role assignments, permission keys and branch context.
- Add a centralized permission helper and protected route/layout components.
- Render navigation and actions from permissions, not scattered role-name comparisons.
- Split mixed POS actions into order-entry, table/reservation and cashier/billing capabilities.
- Build role-specific operational workspaces for Waiter, Receptionist, Captain, Cashier and Manager before exposing those routes.
- Keep Admin-only role/permission configuration separate from Manager operational staff management.
- Handle 401, 403, branch switch and expired sessions consistently.
- Never store refresh tokens in localStorage; use secure HTTP-only cookies where supported.

Until those frontend modules exist, do not route every staff role into the current generic POS screen. The existing AdminDashboard and StaffPOS are prototype screens, not complete role workspaces.

## 10. Audit, cache and security requirements

Audit role assignments, permission changes, staff provisioning/suspension, branch changes, refunds, discounts, cancellations, bill reprints, post-payment adjustments and sensitive settings changes. Audit records should be append-only at the application level and redact secrets/credentials.

If permission caching is introduced, key it by user/role/branch authorization version and invalidate on every relevant change. Never let a stale cache preserve revoked privileges. Enforce rate limits and MFA for privileged accounts where feasible.

## 11. Acceptance criteria

- Exactly seven standard roles are seeded and documented.
- Public registration always yields CUSTOMER.
- Client-supplied role escalation is rejected.
- Every protected API endpoint has a permission and scope policy.
- Branch, ownership and assignment checks are enforced server-side.
- Manager cannot alter Admin role permissions or grant Admin.
- Refund initiation and approval are separate.
- Permission revocation takes effect promptly.
- All sensitive actions are audited.
- Automated tests cover allowed and denied role/action combinations, cross-branch access, ownership, concurrent operations and stale authorization.
- Frontend route visibility is never relied upon as backend security.

## 12. Implementation sequence

1. Review the source ER diagram and reconcile identities, branches, tables, sessions, orders and payments.
2. Finalize PostgreSQL RBAC schema, constraints, indexes and seed templates.
3. Implement authentication, account lifecycle and token rotation/revocation.
4. Implement permission evaluation, branch scope and resource policies.
5. Implement Admin role/permission configuration and Manager operational staff management.
6. Integrate Customer, Reservation, Waiter, Captain and Receptionist workflows.
7. Split POS order entry from cashier billing/payment/refund workflows.
8. Implement Manager reports, inventory and expenses with branch scope.
9. Implement frontend API session integration and role-aware route/action rendering.
10. Run authorization, security, concurrency and end-to-end tests before production rollout.

**Implementation status:** This is the approved design. It does not claim that backend authorization, database migrations or production frontend RBAC have been implemented.
