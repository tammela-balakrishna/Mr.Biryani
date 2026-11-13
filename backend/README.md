# Mr. BIRIYANI — Backend

> **Status: Architecture and implementation plan.** This document describes the planned backend. It does not imply that the API, database schema, integrations, or deployment have been implemented.

## Overview

The backend will provide a centralized, secure API for the Mr. BIRIYANI customer website, admin dashboard, and multiple staff POS devices. It will own business rules and persistent restaurant data; browser storage must not be treated as the source of truth for shared operations.

### Planned architecture

- **Runtime and API:** Node.js and Express.js, exposed through versioned REST endpoints under `/api/v1`.
- **Database:** PostgreSQL for relational integrity, transactions, concurrency control, and reporting.
- **Data access:** Prisma ORM for schema management and migrations, with parameterized SQL for measured performance-critical queries.
- **Authentication:** Short-lived, signed JWT access tokens.
- **Authorization:** Role- and permission-based access control enforced by API middleware.
- **Validation:** Zod request validation.
- **Real-time updates:** WebSockets for POS and kitchen notifications; PostgreSQL remains authoritative.
- **Operations:** Structured logging, automated tests, Docker packaging, monitoring, and verified backups.

The initial deployment should be a **modular monolith**, not microservices. Module boundaries should remain explicit so components can be extracted later if operational scale justifies it.

## Repository documentation

- [Backend data-flow diagrams](./docs/data-flow-diagrams.md) — context (Level 0), backend processes (Level 1), and detailed authentication, online ordering, POS, reservations, and payment flows.

## Application clients

| Client | Main responsibilities |
| --- | --- |
| Customer website | Registration/login, menu browsing, online orders, order history, reservations, profile |
| Admin dashboard | Menu and staff management, restaurant operations, reports, audit review |
| Staff POS | Dine-in, takeaway and walk-in orders, table sessions, payments, billing |
| Kitchen display (future integration) | Receive and display kitchen tickets and order-state updates |

All clients call the same backend API. The API authenticates the caller, authorizes each operation, validates input, and delegates business rules to the relevant module.

## Technology decisions

| Concern | Planned choice | Notes |
| --- | --- | --- |
| Runtime | Node.js | Backend execution |
| HTTP framework | Express.js | REST API and middleware |
| Database | PostgreSQL | Central transactional data store |
| ORM / migrations | Prisma | Typed data access and schema migrations |
| Optimized queries | Parameterized SQL | Use only where profiling justifies it |
| Authentication | JWT access tokens | Short-lived; validate signature, issuer, audience and expiry |
| Password hashing | Argon2id (preferred) or bcrypt | Never store plaintext passwords |
| Validation | Zod | Validate request bodies, parameters and query strings |
| API contract | OpenAPI / Swagger | Document versioned endpoints |
| Logging | Pino | Structured application logs |
| Testing | Jest or Vitest + Supertest | Unit, integration and API tests |
| Real-time | WebSockets | Operational event delivery, not durable storage |
| Cache / queues | Redis, when justified | Cache and background work; PostgreSQL remains source of truth |
| Packaging | Docker | Reproducible development and deployment |

## Roles and authorization

The initial application roles are:

- **customer** — self-registration; access to their own profile, orders, payments and reservations.
- **staff** — provisioned by an administrator; access to permitted POS and restaurant operations.
- **admin** — controlled administrative access to users, staff, menu, operations, reports and audit records.

Authorization must be enforced by the backend, not by React route visibility. Public registration must always assign the `customer` role. The API must ignore or reject client-supplied role escalation. Staff and admin accounts must be provisioned through an authorized administrative process.

Use permissions for finer-grained capabilities rather than scattering role-name checks throughout business logic. Customer-owned resources must be scoped to the authenticated user.

### Token policy

- Keep access tokens short-lived and sign them with a managed secret or private key.
- Validate signature, allowed algorithm, issuer, audience, expiry and relevant claims.
- Do not put passwords, payment details, or other secrets in JWT claims.
- Do not treat a decoded token as trusted until its signature and claims are verified.
- If refresh tokens are added, use rotation, secure storage, reuse detection and revocation. Refresh-token persistence is a separate design decision from stateless access-token verification.
- Apply rate limits to authentication and other abuse-sensitive endpoints.

## Planned backend modules

| Module | Responsibility | Principal data |
| --- | --- | --- |
| Auth and users | Registration, login, profiles, account lifecycle | users |
| Roles and permissions | Role assignment and authorization policy | roles, permissions, user_roles, role_permissions |
| Menu | Categories, items, variants, availability | categories, menu_items, menu_item_variants |
| Inventory | Stock tracking and controlled deductions | inventory / stock movements |
| Orders | Order lifecycle, item snapshots, status history | orders, order_items, order_status_history |
| POS and tables | POS operations, table allocation and dining sessions | restaurant_tables, table_sessions |
| Reservations | Availability, booking and confirmation lifecycle | reservations |
| Payments and billing | Gateway abstraction, offline tender records, invoices and refunds | payments, invoices |
| Kitchen | Kitchen tickets and preparation states | kitchen_tickets |
| Reports | Database-backed operational and sales reporting | derived from operational records |
| Audit and notifications | Administrative audit trail and outbound notifications | audit_logs, notifications |
| Branches and devices | Multi-branch context and registered POS devices | branches, devices |

The exact tables, columns, foreign keys, cardinalities, constraints and indexes must be finalized against the existing restaurant ER diagram before migrations are written. This plan is not a substitute for that schema review.

## API outline

All routes are proposed and will be versioned under `/api/v1`.

| Area | Proposed endpoints |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Menu | `GET /menu/categories`, `GET /menu/items`, `GET /menu/items/:id`, admin-managed create/update/archive operations |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/:id`, controlled status transitions, invoice retrieval |
| POS | POS order creation, table lookup, payment recording and billing |
| Reservations | Reservation creation, availability lookup, retrieval and authorized status transitions |
| Admin | Dashboard metrics, user/staff management, reports and audit-log retrieval |

Endpoint methods, payloads, response envelopes, pagination, error codes and permission requirements will be specified in the OpenAPI contract before implementation.

## Core business data flows

### Online order

1. The customer submits item identifiers, quantities and checkout details.
2. The API validates the customer and request.
3. The order service reloads current menu prices and availability from PostgreSQL; client-submitted prices are never authoritative.
4. The service creates the order and immutable order-item price/name snapshots in a database transaction.
5. For online payment, the payment adapter creates a gateway payment request.
6. A verified gateway webhook updates payment and order financial state idempotently.
7. The system emits confirmation and operational events.

### Offline POS order

1. Staff authenticates on a registered POS device.
2. Staff selects dine-in, takeaway or walk-in.
3. For dine-in, the backend checks and allocates a table within a transaction.
4. The backend creates the order and order-item snapshots.
5. The kitchen workflow receives a ticket.
6. Staff records the accepted tender (for example, cash, UPI or card).
7. The backend records the payment and issues a persistent invoice.
8. The table session is closed and the table released only when the dining workflow is complete.

### Reservation

1. The customer requests a date/time and party size.
2. The backend checks availability against active reservations and table capacity.
3. Reservation creation/confirmation uses transaction-safe conflict prevention.
4. Staff may confirm, reject, seat or complete a reservation according to permissions.
5. A confirmed reservation does not itself mark a table occupied; occupancy starts with the actual dining session.

## Data integrity and concurrency

Multiple POS devices may act on the same restaurant state concurrently. Critical operations must be safe under concurrent requests.

- Use PostgreSQL transactions for order creation, table allocation, payment recording and inventory changes.
- Use row-level locks or suitable constraints for contested resources such as tables and stock.
- Use idempotency keys for order/payment operations where clients or gateways may retry.
- Enforce unique gateway transaction references and invoice/order-number constraints in the database.
- Verify payment webhooks cryptographically and validate amount, currency, merchant reference and payment state.
- Make state transitions explicit and reject invalid or stale transitions.
- Persist operational state before publishing WebSocket events. Use an outbox pattern if reliable event delivery becomes necessary.
- Use database-backed pagination and appropriate indexes; avoid unbounded list endpoints.

## Security and operational requirements

- HTTPS in deployed environments; secure CORS policy and security headers.
- Centralized authentication, permission checks and request validation.
- Parameterized database access; never concatenate untrusted input into SQL.
- Secrets only in environment/secret management, never committed to Git.
- Redact credentials, tokens, payment secrets and personal data from logs.
- Rate limiting, request-size limits, safe error responses and audit logging.
- Automated database backups plus periodic restore/recovery tests.
- Health/readiness checks, structured logs, metrics and error monitoring.
- Automated tests for authorization boundaries, payment verification, idempotency and concurrent POS/table operations.

## Project structure target

```text
backend/
├── docs/
│   └── data-flow-diagrams.md
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── menu/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── pos/
│   │   ├── payments/
│   │   ├── reservations/
│   │   ├── tables/
│   │   ├── kitchen/
│   │   └── reports/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── .env.example
├── package.json
└── Dockerfile
```

A typical feature module should separate routes, controllers, services, repositories and validation. Keep HTTP concerns out of business services and database details out of controllers.

## Development roadmap

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 1. Foundation and database | Verify ER diagram, settle schema, configure PostgreSQL/Prisma, migrations, config, logging and error handling | Reviewed schema and repeatable migrations |
| 2. Authentication and RBAC | Customer registration, staff provisioning, password hashing, JWT verification and permissions | Automated auth and authorization tests pass |
| 3. Menu and customer APIs | Menu, profile, online order creation, order history and tracking | Customer workflows use API-backed data |
| 4. POS operations | Dine-in/takeaway/walk-in, multiple devices, tables, sessions and billing | Concurrent POS scenarios are safe |
| 5. Reservations and kitchen | Availability, confirmation, kitchen tickets and real-time updates | Conflicting bookings are prevented |
| 6. Admin and reports | Menu/staff management, dashboard metrics, sales reports and audit logs | Reports derive from persisted data |
| 7. Production readiness | Security review, load tests, Docker deployment, monitoring and backup recovery | Production checklist is verified |

## Decisions still to finalize

- Review the source ER diagram and reconcile it with the proposed module list.
- Finalize the database schema, monetary/tax model, order statuses and invoice numbering.
- Define branch scoping and POS device registration/authorization.
- Define reservation duration, seating rules, cancellation policy and walk-in behavior.
- Select the payment provider after technical, settlement, refund and commercial verification. Razorpay, Zoho Payments and Cashfree remain candidates; the core payment module will use an adapter interface.
- Decide whether offline POS operation is in scope for the first release. If required, design a controlled local queue, conflict handling and synchronization protocol separately; do not assume browser localStorage alone provides safe multi-device offline operation.

## Current status

This repository documentation records the proposed architecture and data flows only. No backend code, database migrations, API routes, payment integration or deployment is claimed to be complete. Implementation should begin with ER-diagram review and a table-by-table schema specification.
