# Mr. BIRIYANI — Backend

> **Status: foundation implemented (roadmap steps 2–5, partial 1).** The Spring Boot application, identity and token lifecycle, Flyway migrations, and the first permission and branch-scope checks exist and are tested. Restaurant domain modules, payments, real-time events and deployment are not yet implemented.

## Overview

The backend is the single shared application backend for the React customer website, management dashboard, staff workspaces, POS devices and the planned React Native application. All clients use the same versioned REST API and PostgreSQL source of truth.

The initial architecture is a **modular monolith**: one deployable Spring Boot application with explicit domain-module boundaries. Do not introduce microservices until independent scaling, deployment or operational requirements justify the added complexity.

## Final technology direction

| Layer | Selected technology | Notes |
|---|---|---|
| Language | Java 21 LTS | Use a supported LTS JDK |
| Framework | Spring Boot 4.1.2 | Pinned parent in `pom.xml` |
| HTTP API | Spring MVC REST | Versioned under `/api/v1` |
| Authentication and security | Spring Security | Bearer-token validation with a custom filter; explicit authorization policies |
| Database | PostgreSQL 16 | Transactional source of truth (Docker Compose for local use) |
| Persistence | Spring Data JPA + Hibernate | Standard domain persistence. Auth uses `JdbcClient` by design, see *Deviations* |
| Complex queries | Spring JDBC / native SQL | Used for the auth and RBAC queries that need explicit atomic SQL |
| Schema migrations | Flyway | `src/main/resources/db/migration`, run on startup |
| Validation | Jakarta Bean Validation | Request DTOs at API boundaries |
| API contract | OpenAPI / Springdoc 3.0.0 | Served at `/v3/api-docs` and `/swagger-ui` |
| Real-time | Spring WebSocket | Not yet implemented |
| Cache | Redis, when justified | Not used |
| Async processing | Spring application events initially | Not yet implemented |
| Observability | Spring Boot Actuator | Only `/actuator/health` is exposed |
| Testing | JUnit 5 + Spring test + Testcontainers | Real PostgreSQL for integration tests |
| Packaging | Docker | `Dockerfile` (multi-stage, non-root runtime) |

Pin dependency and plugin versions. Do not use snapshot dependencies in production.

## Deviations from the spec, and why

- **Auth persistence uses `JdbcClient`, not JPA.** Refresh-token rotation must revoke the old row and insert its successor in one atomic statement sequence, and the reuse-detection queries are clearer as explicit SQL. Domain modules should use JPA entities as the spec says. Revisit this if the team prefers one persistence style.
- **Package names follow the spec modules.** Auth code lives in `identity`, and RBAC catalogue and policy code lives in `authorization`.
- **Captain has no `staff.read`.** The spec's default matrix gives Captain no staff-account access.

## Architecture principles

1. **One backend for all clients.** React web and React Native share API contracts, identity, permissions, business rules and database.
2. **Modular monolith first.** Keep modules logically isolated and independently testable while deploying one application.
3. **PostgreSQL is authoritative.** Redis, WebSockets and message brokers are supporting infrastructure, not sources of truth.
4. **Server-side authorization.** Every protected API operation checks identity, current permission, branch scope and resource ownership/assignment.
5. **Transactional business operations.** Use database transactions, constraints, idempotency and appropriate locking for orders, payments, reservations and stock.
6. **API-first integration.** Publish client-neutral OpenAPI contracts and maintain backward compatibility for supported clients.
7. **No direct client database access.** Neither React nor React Native connects directly to PostgreSQL.
8. **Measure before scaling infrastructure.** Begin without microservices, Kubernetes, Redis or a broker unless a demonstrated requirement calls for them.

## Official seven-role RBAC

| Role | Primary responsibility |
|---|---|
| Customer | Own profile, online orders, reservations, tracking, history and bills |
| Waiter | Assigned tables, permitted order entry/modification, kitchen dispatch and serving |
| Receptionist | Reservations, availability, check-in, table allocation and walk-ins |
| Captain | Floor supervision, waiter assignment and service coordination |
| Cashier | Bills, split payments, payment collection, receipts and authorized refunds |
| Manager | Operational staff, responsibilities, branch-scoped analytics, inventory and expenses |
| Admin | Users, roles, permissions, menu/pricing/tax, integrations, security and system settings |

Branch model: single branch at launch, multi-branch ready from day one. Role model: seven protected predefined roles with Admin-customizable permission mappings (`predefined_custom`). Do not introduce a generic `staff` role or additional standard role types.

See [Final RBAC specification](./docs/rbac.md) for the permission catalogue, default role matrix, scope rules, data model, JWT policy, API authorization, security controls and acceptance criteria.

### Authorization principles

- Use stable `resource.action` permission keys, not scattered role-name checks.
- Public registration always creates Customer; never accept a role from the client.
- Manager can manage operational staff only within delegated scope; cannot grant Admin or edit role permission templates.
- Admin alone manages role permissions and system security configuration.
- Enforce branch scope, customer ownership and waiter/table/order assignment on the server.
- Separate refund initiation from approval; audit sensitive financial and administrative operations.
- Frontend route guards are usability controls, never security controls.
- JWT identifies the principal; current account status, permissions and scope are checked server-side against the database on every request.
- Use Spring Security request authorization and method-level security (`@PreAuthorize`), supplemented by explicit domain-level ownership and branch checks.

## Application clients

| Client | Responsibility |
|---|---|
| Customer website | Registration/login, menu, online orders, profile, reservations and own history |
| Staff workspaces | Waiter, Receptionist, Captain and Cashier operational workflows |
| Manager dashboard | Assigned-branch staff operations, inventory, expenses and reports |
| Admin dashboard | Global user/role/permission, restaurant and integration administration |
| POS devices | Multiple registered devices with authenticated staff and branch context |
| Kitchen display | Kitchen ticket visibility and order-state updates, permission-scoped |
| React Native app | Native customer and authorized staff workflows using the same API |

The frontend integration contract is documented in [Frontend RBAC integration](../mr-biryani/docs/rbac-integration.md). Current frontend authentication is a mock prototype and is not production RBAC.

## Planned Spring Boot modules

| Module | Responsibility | State |
|---|---|---|
| Identity and users (`identity`) | Registration, login, token/session lifecycle, profiles and account status | Implemented (auth core) |
| Authorization (`authorization`) | Seven role templates, assignments, permission evaluation and audit | Partial: catalogue, seed, branch check, two protected endpoints |
| Branches and devices | Branch scope, user assignments and POS device registration | Branch scope only |
| Customers | Customer profiles, addresses and customer history | Not started |
| Menu | Categories, items, variants, pricing and availability | Not started |
| Orders | Online/POS order lifecycle, immutable item snapshots and status history | Not started |
| Reservations | Availability, booking, check-in and lifecycle | Not started |
| Tables and sessions | Allocation, transfer, dining sessions and release | Not started (blocked on ER review) |
| Kitchen/service | Tickets, preparation coordination and serving status | Not started |
| Billing and payments | Invoices, split billing, tender records, gateway adapter and refunds | Not started |
| Inventory and expenses | Stock movements, purchasing and expense controls | Not started |
| Reports | Branch-scoped sales, revenue and staff performance | Not started |
| Audit and notifications | Append-only audit trail and operational notifications | Audit table and triggers only |
| AI assistant / RAG | Future approved-knowledge ingestion, retrieval, grounded responses | Planned only |

Each module should expose application services and own its domain rules. Controllers must not directly access repositories from unrelated modules. The existing restaurant ER diagram must be reviewed before finalizing the physical schema, foreign keys and migrations.

## Data integrity, payments and concurrency

- Use PostgreSQL transactions for order creation, table allocation, payment recording, inventory adjustments and role/permission updates.
- Use row-level locks, optimistic versioning and database constraints for contested tables, reservations and stock; select the strategy per use case.
- Use idempotency keys for retryable order/payment operations and webhook processing.
- Enforce unique gateway references, invoice numbers and relevant business keys in the database.
- Verify provider webhook signatures and amount, currency, reference and state before recording success.
- Persist state before emitting WebSocket notifications. Use a transactional outbox when reliable event delivery is required.
- Do not hold a database transaction open while waiting for a slow external payment gateway.
- Store monetary amounts in fixed-precision numeric columns and retain order-item name/price/tax snapshots.
- Store timestamps in UTC and localize only for display.
- Apply branch filters in service/repository queries, not only in the UI.
- Use bounded database connection pools and monitor pool saturation.
- Avoid ORM N+1 queries; paginate large result sets and add indexes based on measured query patterns.

## API groups

All endpoints are under `/api/v1`.

Implemented:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/session`
- `GET /roles`: Admin only (`roles.manage`)
- `GET /permissions`: Admin only (`permissions.manage`)
- `PUT /roles/{code}/permissions`: Admin only (`roles.permissions.update`). Replaces a role template. Admin keeps its administration keys, administration keys are never granted below Admin, and customer keys are only granted to Customer. Takes effect on the next request.
- `POST /branches/{branchId}/staff`: create a staff account. Admin (any branch) or Manager (assigned branches) with `staff.create`. Only Admin may create Admin accounts. Customer cannot be created here.
- `DELETE /branches/{branchId}/staff/{userId}`: remove a staff member's access to one branch (`staff.disable`). Admin accounts are protected, the last active Admin cannot be removed, and you cannot disable yourself.
- `GET /branches/{branchId}/staff`: requires `staff.read` and an assignment to that branch. Otherwise 404, so branch existence is not revealed.

Menu and online ordering (step 7):

- `GET /menu`: public menu (active categories and items, with availability).
- `POST /menu/categories`, `POST /menu/items`: `menu.create` (Admin).
- `PATCH /menu/items/{id}/price`: `menu.price.update` (Admin). `PATCH /menu/items/{id}/availability`: `menu.availability.update` (Admin, Manager).
- `POST /orders` (customer, `orders.create_own`): requires an `Idempotency-Key` header. Prices, names and tax come from the server, and a repeated key returns the same order. Reusing a key with different items returns 409.
- `GET /orders` and `GET /orders/{id}`: the customer's own orders. Staff with `orders.read` can view orders in their own branch. Anything else returns 404.
- `POST /orders/{id}/cancel`: customer, only while the order is still PLACED.
- `PATCH /orders/{id}/status`: staff (`orders.update`, or `orders.cancel` for CANCELLED). Transitions: PLACED to ACCEPTED or CANCELLED, ACCEPTED to PREPARING or CANCELLED, PREPARING to READY, READY to SERVED, SERVED to COMPLETED. Other moves return 409.
- `GET /branches/{branchId}/orders[?status=]`: staff list for one branch.
- `POST /branches/{branchId}/reservations`: customers request a table for themselves (REQUESTED). Staff (`reservations.create`) book a CONFIRMED reservation for a named guest.
- `GET /reservations/mine`, `POST /reservations/{id}/cancel`: the customer's own reservations. Cancel is allowed from REQUESTED or CONFIRMED.
- `GET /branches/{branchId}/reservations?date=YYYY-MM-DD`: staff view (`reservations.read`).
- `POST /branches/{branchId}/reservations/{id}/confirm` (`reservations.confirm`) and `/check-in` (`reservations.check_in`): staff.

Planned: `/customers`, `/branches`, `/tables`, `/pos`, `/kitchen`, `/billing`, `/payments`, `/inventory`, `/expenses`, `/reports`, `/admin/settings`, `/chat`.

Every protected operation must declare required permission(s), branch policy and resource policy.

## Authentication and token lifecycle

- Spring Security with bearer-token validation (HS256, issuer, audience and expiry checked).
- Access tokens last 15 minutes.
- Refresh tokens are stored only as SHA-256 hashes, rotated on every use, and reuse of a rotated token revokes the whole family.
- Logout and account disablement take effect on the next request, because the database is checked each time.
- Signing keys, database credentials and provider secrets come from environment variables and are never committed. Note: the signing secret is a single symmetric key, so key rotation is not yet implemented.
- Generic authentication failures, and rate limiting on auth endpoints (in-process; replace with a shared store before running more than one instance).

## Real-time and asynchronous processing

Implemented (step 12) with STOMP over WebSocket at `/ws` (in-process broker, no external broker):

- **Connect:** the STOMP `CONNECT` frame carries `Authorization: Bearer <access token>`. The same checks as REST apply (account active, auth version, session live).
- **Subscribe:** `/topic/branches/{branchId}/kitchen` needs `kitchen.orders.read`, and `/topic/branches/{branchId}/orders` needs `orders.read`. Both also need an assignment to that branch. Anything else is refused.
- **Events:** each order placed or status change publishes `{type, branchId, orderId, status, at}` after the database commit, so clients never see an event for a change that was rolled back. Messages carry no customer details. Clients re-fetch the order over REST.
- **Known limitation:** a permission revoked while connected stops new subscriptions, but existing subscriptions stay open until the client reconnects.
- **Not yet:** kitchen-ticket screens and push notifications to phones.

## Payment provider strategy

Razorpay, Zoho Payments and Cashfree remain candidates pending commercial and technical verification. Keep provider-specific behavior behind a provider-neutral payment adapter. Do not hardwire provider assumptions into order or billing modules. Confirm provider pricing, settlement terms and contract requirements before selecting one.

## AI assistant / RAG

Implemented (step 14), first release: public knowledge and the signed-in customer's own order and reservation status. Approved scope: public + own order status; Spring Boot module; Claude for answers; 30-day conversation retention.

- **Endpoints** (`/api/v1/chat`): `POST /sessions` (anonymous or signed in), `POST /sessions/{id}/messages`, `GET /sessions/{id}/messages`, `POST /sessions/{id}/messages/{messageId}/feedback`. Anonymous sessions are reachable by their unguessable id; sessions created by a signed-in user are private to that user (other users get 404).
- **Admin knowledge** (`/api/v1/chat/knowledge`): list (`chat.knowledge.read`), create (`chat.knowledge.manage`), publish and retire (`chat.knowledge.publish`). Only PUBLISHED content is retrievable. Each publish is a new version, and retire takes content out of answers immediately.
- **How it answers:** (1) signed-in customers asking about their orders or reservations get live data from the order and reservation services, never from the knowledge index; (2) other questions are matched against published passages, and the answer quotes the best passages with citations; (3) if nothing matches, the assistant says it has no verified information. Transactional actions (orders, refunds, reservations) cannot be triggered by a chat message.
- **Claude:** when `ANTHROPIC_API_KEY` is set, the passages are passed to Claude with instructions to answer only from them and to ignore instructions inside them. If the model call fails, the quoted-passage answer is returned. **The live Claude path has not been exercised here, because no API key was available.**
- **Retention:** conversations expire after 30 days, and a nightly job deletes them (messages, citations and feedback go with them).
- **Evaluation:** `AssistantEvaluationTest` runs the golden set in `src/test/resources/eval/` offline (no model needed), and writes `target/eval/report.json`. The current files are DRAFTS built from sample content; replace them with restaurant-approved content before using the pass rate as a release signal. `ClaudeLiveEvaluationTest` runs against Claude only when `ANTHROPIC_API_KEY` is set, and is skipped otherwise.
- **Kill switch:** `CHAT_ENABLED=false` returns 503 for chat only. Ordering and POS are not affected.

Not yet built (see the spec's phases 2, 5 and 6): embeddings and pgvector (retrieval is full-text for now, pending an approved embedding provider), an evaluation harness and golden question set, prompt-injection and red-team tests beyond the unit checks, an admin UI for knowledge, streaming responses, and English-only content. The website and mobile widgets are not built.

## Development roadmap

1. Audit the repository, existing React API usage, ER diagram and any existing database schema. **Partly done** (identity and RBAC only; ER diagram still needs review).
2. Finalize domain model, module boundaries, API contracts and database design. **In progress.**
3. Establish the Spring Boot foundation, configuration profiles, Flyway migrations, logging, error handling and automated tests. **Done** (dedicated `application-local.yml`/`application-test.yml` profiles are not yet added).
4. Implement authentication and the token/session lifecycle. **Done.**
5. Implement the permission engine, branch scope, ownership and assignment policies. **Started:** permission checks, branch scope and tests exist. Ownership and assignment rules wait for the domain modules.
6. Implement Admin role/permission management and Manager operational staff management.
7. Implement customer, menu, order and reservation APIs. **Done** (menu is restaurant-wide for now; branch-specific pricing is still to do).
8. Implement Waiter, Receptionist and Captain floor/POS workflows. **Provisional:** dining tables, status, and waiter assignment (`/branches/{b}/tables`). Final schema waits for the ER review. POS order entry is not built.
9. Implement cashier billing, split payments, receipts, refunds and payment adapter. **Partly done:** bills from orders, split cash/card/UPI tenders (idempotent, locked, never over the balance), refunds that a different person must approve. Receipts and a live payment-provider adapter are not built; no provider or keys have been chosen.
10. Implement Manager reports, inventory and expenses. **Done for the first release:** stock levels with no negative stock and a low-stock flag, expenses with a separate approver, and a sales report (paid bills, approved refunds, net, by tender method).
11. Integrate React sessions, permissions, branch context and role-specific workspaces.
12. Implement real-time events, notifications and reliable asynchronous processing as required. **Done for order status** (STOMP over WebSocket, committed-only events). Outbox and a message broker are not added, because nothing needs them yet.
13. Integrate the shared API into the React Native application.
14. Implement the RAG knowledge pipeline and chat API only after its separate security and evaluation requirements are approved. **Partly done:** public assistant and own-status lookups, with full-text retrieval and a Claude adapter. The embedding pipeline and evaluation harness are not started.
15. Complete security, concurrency, integration, load, backup/restore and production-readiness testing. **Started:** CI workflow, backup and restore scripts (restore drill verified against a copy), k6 load script. The load test has not been run, and the workflow has not run on GitHub yet.

## Deployment and operations

- Dockerfile: multi-stage build on `eclipse-temurin:21`, runs as a non-root user. Built and running locally with `docker compose`.
- CI: `.github/workflows/backend-ci.yml` runs `./mvnw verify` (all tests, with Testcontainers) and builds the image. GitHub only reads workflows from the repository root, so move it there if this folder is not the root.
- Backups: `scripts/backup.sh` writes a compressed custom-format dump. `scripts/restore-test.sh` restores a dump into a scratch database and checks roles, the audit guard and migrations, then drops the scratch database. Run it on a schedule against recent backups.
- Load testing: `scripts/load/order-placement.js` (k6). Run it against staging only.
- Flyway migrations run on application startup. For production, run them as a controlled deployment step.
- Secrets from environment variables only.
- Actuator exposes only `/actuator/health`. OpenAPI docs are at `/v3/api-docs` and `/swagger-ui`; set `API_DOCS_ENABLED=false` in production.
- Not yet in place: managed PostgreSQL and its backup schedule, centralized logs, alerting, object storage.

## Shared API consumers: React web and React Native

This backend is the single shared application backend for both clients:

- **React website:** `mr-biryani/`
- **React Native app:** `react-native/` (**not yet in this repository**)

Non-negotiable integration rules:

1. Do not build a second mobile backend, separate database or duplicate domain services.
2. Do not let either client connect directly to PostgreSQL.
3. Keep business rules, pricing/tax calculations, reservation/table allocation, order state transitions, payment verification and permission enforcement on the backend.
4. Keep UI presentation, navigation, local transient state and device capabilities in each client.
5. Expose client-neutral API contracts through OpenAPI; version breaking changes.
6. Use the same identity and role/permission source for both clients.
7. Use the same idempotency, concurrency, audit and branch/ownership controls regardless of client.
8. Device-specific features (push, printing, camera, secure storage, offline queue) are implemented in the mobile app and use shared endpoints for business state.

```text
React Website ───────┐
                     ├── HTTPS /api/v1 ── Shared Spring Boot backend
React Native App ────┘                          |
                                                ├── Shared authentication + seven-role RBAC
                                                ├── Shared domain modules and application services
                                                ├── PostgreSQL (source of truth)
                                                ├── WebSocket events / notifications (planned)
                                                └── Payment provider adapters (planned)
```

## Repository documentation

- [RBAC specification](./docs/rbac.md)
- [Backend data-flow diagrams](./docs/data-flow-diagrams.md)
- [Frontend RBAC integration contract](../mr-biryani/docs/rbac-integration.md)
- [RAG chatbot architecture — planned, not yet in repository](./docs/rag-chatbot-architecture.md)
- [React Native implementation specification — not yet in repository](../react-native/README.md)

## Running locally

```bash
docker compose up -d              # PostgreSQL 16 on :5432
cp .env.example .env              # set a real JWT_SECRET (>= 32 bytes)
./mvnw spring-boot:run            # API on http://localhost:8080
./mvnw test                       # integration tests use Testcontainers (needs Docker)
```

On startup the app runs Flyway, then seeds the roles, permission catalogue, baseline mappings, the launch branch and the initial Admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Both are idempotent.

If the old Node/Prisma prototype database still exists, reset it first with `docker compose down -v`, because Flyway's `V1` migration conflicts with the old tables.

## Current implementation status

**Implemented and tested** (20 tests passing against a real PostgreSQL container):

- Spring Boot 4.1.2 application with configuration validation, request IDs, JSON error envelope, and Springdoc.
- Identity: register (always Customer), login with lockout, refresh-token rotation with reuse detection, logout, current session.
- Authorization: seven roles, permission catalogue, role defaults, seeded idempotently, database guards (system roles cannot be deleted or repurposed; audit log is append-only).
- Permission checks via `@PreAuthorize`, and branch scope enforced against the database on each request.


**Website (step 11, partly done):** `mr-biryani` now signs in through `/auth` (email and password, token refresh via the HTTP-only cookie), reads the live menu, places orders with an `Idempotency-Key`, and shows the customer's own orders and reservations. Route guards and role-aware navigation use the server's permission list. Set `VITE_API_BASE_URL` if the API is not at `http://localhost:8080`. Not done: staff workspaces and admin screens (they still use demo data and are not routed), password reset by email, and the browser-stored passwords were removed. Tax and totals come from the server.

**Not implemented:** restaurant domain modules, Admin and Manager management APIs (roadmap 6), payments, reports, real-time events, React Native, RAG, production deployment and CI.

**Known gaps:** the auth rate limiter is in-process only; the signing key has no rotation; `application-local.yml`/`application-test.yml` profiles are not yet added; the two linked documents above are missing.

## Operations (steps 8-10, provisional)

- Tables: `GET/POST /branches/{b}/tables`, `PATCH .../{id}/status`, `POST .../{id}/assignment` (the waiter must hold WAITER in that branch; one active waiter per table).
- Billing: `POST /branches/{b}/orders/{orderId}/bill`, `GET .../bills/{id}`, `POST .../bills/{id}/payments` (requires Idempotency-Key), `POST .../payments/{id}/refunds`, `POST .../refunds/{id}/decision`, `GET .../reports/sales?from&to` (up to one year).
- Inventory and expenses: `GET/POST /branches/{b}/inventory`, `POST .../inventory/{id}/movements`, `GET/POST /branches/{b}/expenses`, `POST .../expenses/{id}/decision`.
- Decisions made without the ER diagram, to confirm at the review: table statuses and the single active waiter rule; payment methods limited to cash, card and UPI, recorded by hand; refunds reopen a bill that drops below its total.
