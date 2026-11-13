# Mr. BIRIYANI — Backend

> **Status: Architecture and implementation plan only.** The selected backend direction is Java + Spring Boot + PostgreSQL. This README documents the target architecture; it does not claim that the Spring Boot application, database migrations, authentication, authorization, integrations or deployment have been implemented.

## Overview

The backend is the single shared application backend for the React customer website, management dashboard, staff workspaces, POS devices and the planned React Native application. All clients use the same versioned REST API and PostgreSQL source of truth.

The initial architecture is a **modular monolith**: one deployable Spring Boot application with explicit domain-module boundaries. Do not introduce microservices until independent scaling, deployment or operational requirements justify the added complexity.

## Final technology direction

| Layer | Selected technology | Notes |
|---|---|---|
| Language | Java 21 LTS | Use a supported LTS JDK |
| Framework | Spring Boot | Select a supported release compatible with the chosen JDK |
| HTTP API | Spring MVC REST | Versioned under `/api/v1` |
| Authentication and security | Spring Security | JWT bearer-token validation; explicit authorization policies |
| Database | PostgreSQL | Transactional source of truth |
| Persistence | Spring Data JPA + Hibernate | Standard domain persistence |
| Complex queries | Spring JDBC / native SQL | Use for measured query or reporting needs |
| Schema migrations | Flyway | Version-controlled, repeatable deployment process |
| Validation | Jakarta Bean Validation | Validate request DTOs at API boundaries |
| API contract | OpenAPI / Springdoc | Document request, response and error contracts |
| Real-time | Spring WebSocket | Operational events; database remains authoritative |
| Cache | Redis, when justified | Introduce only for measured caching/coordination needs |
| Async processing | Spring application events initially; message broker when justified | Reliable outbox-based delivery for important events |
| Observability | Spring Boot Actuator + Micrometer | Health, metrics and production diagnostics |
| Testing | JUnit 5 + Spring test support + Testcontainers | Unit, integration and database-backed tests |
| Packaging | Docker | Portable build and deployment |

Pin dependency and plugin versions. Verify Spring Boot/JDK compatibility and support policy when implementation begins. Do not use snapshot dependencies in production.

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
- JWT identifies the principal; current account status, permissions and scope are checked server-side. Avoid treating long-lived token permission claims as the authoritative source after permissions change.
- Use Spring Security request authorization and method-level security, supplemented by explicit domain-level ownership and branch checks.

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

| Module | Responsibility |
|---|---|
| Identity and users | Registration, login, token/session lifecycle, profiles and account status |
| Authorization | Seven role templates, assignments, permission evaluation and audit |
| Branches and devices | Branch scope, user assignments and POS device registration |
| Customers | Customer profiles, addresses and customer history |
| Menu | Categories, items, variants, pricing and availability |
| Orders | Online/POS order lifecycle, immutable item snapshots and status history |
| Reservations | Availability, booking, check-in and lifecycle |
| Tables and sessions | Allocation, transfer, dining sessions and release |
| Kitchen/service | Tickets, preparation coordination and serving status |
| Billing and payments | Invoices, split billing, tender records, gateway adapter and refunds |
| Inventory and expenses | Stock movements, purchasing and expense controls |
| Reports | Branch-scoped sales, revenue and staff performance |
| Audit and notifications | Append-only audit trail and operational notifications |
| AI assistant / RAG | Future approved-knowledge ingestion, retrieval, grounded responses, citations, feedback and role-scoped read-only tools |

Each module should expose application services and own its domain rules. Controllers must not directly access repositories from unrelated modules. Shared code should be limited to genuinely cross-cutting concerns such as API errors, security context, auditing and common primitives.

The existing restaurant ER diagram must be reviewed before finalizing the physical schema, foreign keys and migrations.

## Suggested package structure

The following is a target structure, not an existing implementation:

```text
backend/
  src/main/java/<base-package>/
    MrBiriyaniApplication.java
    config/
    common/
      error/
      api/
      audit/
    identity/
      api/
      application/
      domain/
      infrastructure/
    authorization/
    branch/
    customer/
    menu/
    reservation/
    tablemanagement/
    order/
    pos/
    kitchen/
    payment/
    billing/
    inventory/
    reporting/
    notification/
    assistant/                 # future RAG module
  src/main/resources/
    application.yml
    application-local.yml
    application-test.yml
    db/migration/               # Flyway migrations
  src/test/java/<base-package>/
  Dockerfile
  README.md
```

Use module-internal packages for API/controllers, application services, domain models/policies and infrastructure/repositories. Keep dependency direction toward domain/application logic; avoid circular module dependencies.

## Data integrity, payments and concurrency

- Use PostgreSQL transactions for order creation, table allocation, payment recording, inventory adjustments and role/permission updates.
- Use row-level locks, optimistic versioning and database constraints for contested tables, reservations and stock; select the strategy per use case.
- Use idempotency keys for retryable order/payment operations and webhook processing.
- Enforce unique gateway references, invoice numbers and relevant business keys in the database.
- Verify provider webhook signatures and amount, currency, reference and state before recording success.
- Persist state before emitting WebSocket notifications. Use a transactional outbox when reliable event delivery is required.
- Do not hold a database transaction open while waiting for a slow external payment gateway. Model payment attempts and state transitions explicitly.
- Store monetary amounts in fixed-precision numeric columns and retain order-item name/price/tax snapshots.
- Store timestamps in UTC and localize only for display.
- Apply branch filters in service/repository queries, not only in the UI.
- Use bounded database connection pools and monitor pool saturation.
- Avoid ORM N+1 queries; paginate large result sets and add indexes based on measured query patterns.

## Proposed API groups

All endpoints are under `/api/v1`; exact methods, payloads, pagination and response envelopes will be specified in OpenAPI.

- `/auth`: register, login, refresh, logout and current session.
- `/customers`: own profile and customer data.
- `/users`: staff and user administration within authorized scope.
- `/roles`, `/permissions`: Admin-controlled role and permission management.
- `/branches`: branch configuration and assignments.
- `/menu`: public reads and authorized management.
- `/orders`: online and POS orders, state transitions and tracking.
- `/reservations`: availability, create, confirm, update, check-in and cancel.
- `/tables`: availability, allocate, assign, transfer and release.
- `/pos`: registered-device and staff POS workflows.
- `/kitchen`: tickets and preparation workflow.
- `/billing`, `/payments`: bills, split tenders, receipts, refunds and reconciliation.
- `/inventory`, `/expenses`: stock and expense operations.
- `/reports`: branch-scoped management reporting.
- `/admin/settings`: Admin-only system configuration.
- `/chat`: future shared conversation/session/message APIs, citations and feedback; private lookups remain owner/branch/assignment scoped.

Every protected operation must declare required permission(s), branch policy and resource policy. API responses and error formats must be consistent across modules.

## Authentication and token lifecycle

- Use Spring Security with JWT bearer-token validation.
- Define issuer, audience, signing-key rotation, allowed algorithms, token expiry and clock-skew policy before implementation.
- Keep access tokens short-lived.
- If refresh tokens are used, store them securely as hashed server-side records and implement rotation, reuse detection, revocation and device/session management.
- Logout and account disablement must have clearly defined revocation semantics. Stateless access-token validation alone does not provide immediate revocation.
- Never store signing keys, database credentials or provider secrets in source control.
- Return generic authentication failures and apply rate limits to sensitive authentication endpoints.

## Real-time and asynchronous processing

- Use WebSockets for kitchen tickets, order status and POS coordination where live updates improve operations.
- Authenticate WebSocket connections and authorize subscriptions by user, role, branch and resource.
- Treat WebSocket messages as notifications; clients must fetch authoritative state from REST APIs or a controlled synchronization endpoint.
- Start with in-process events only for non-critical work.
- Use an outbox and a message broker when events must survive process restarts or be consumed by multiple independent workers.
- Notifications, report generation and other non-critical tasks should not block order/payment requests.

## Payment provider strategy

Razorpay, Zoho Payments and Cashfree remain candidates pending commercial and technical verification. Keep provider-specific behavior behind a provider-neutral payment adapter. Do not hardwire provider assumptions into order or billing modules.

Payment processing must support idempotent requests, verified webhooks, explicit payment states, refunds, reconciliation and auditable financial records. Confirm current provider pricing, settlement terms, supported payment methods and contractual requirements before selecting a production gateway.

## AI assistant / RAG — planned only

The RAG assistant is a future backend capability, not an implemented API. See [RAG chatbot architecture](./docs/rag-chatbot-architecture.md) for the proposed pipeline, data model, security controls and evaluation strategy.

Target design:

- Implement the assistant as a Spring Boot module or a separately deployable service only if later justified.
- Expose a versioned API through the same shared backend contract, initially proposed as `POST /api/v1/chat`.
- Ingest only approved, versioned restaurant knowledge such as FAQs, policies, menu and verified allergen/branch information.
- Evaluate PostgreSQL + pgvector for vector retrieval; verify extension availability, version compatibility and retrieval quality before committing to it.
- Keep embedding and LLM provider integrations behind adapters; credentials remain server-side.
- Enforce public/private visibility, branch and role scopes before retrieval and tool calls.
- Retrieve a customer's own live order/reservation information from authorized domain services, never from a shared vector index of private operational records.
- Return grounded answers with citations and abstain when evidence is insufficient.
- The initial assistant is read-only. Generated text must not directly execute order, payment, refund, reservation or inventory mutations.
- Track retrieval quality, groundedness, citation coverage, latency, token cost, user feedback and safety regressions.

**Implementation status:** no RAG route, model integration, embeddings, vector migration, ingestion worker or chatbot backend dependency is claimed implemented. Do not describe the chatbot backend as available until it has been built, tested and deployed.

## Development roadmap

1. Audit the repository, existing React API usage, ER diagram and any existing database schema.
2. Finalize domain model, module boundaries, API contracts and database design.
3. Establish the Spring Boot foundation, configuration profiles, Flyway migrations, logging, error handling and automated tests.
4. Implement authentication and the token/session lifecycle.
5. Implement the permission engine, branch scope, ownership and assignment policies.
6. Implement Admin role/permission management and Manager operational staff management.
7. Implement customer, menu, order and reservation APIs.
8. Implement Waiter, Receptionist and Captain floor/POS workflows.
9. Implement cashier billing, split payments, receipts, refunds and payment adapter.
10. Implement Manager reports, inventory and expenses.
11. Integrate React sessions, permissions, branch context and role-specific workspaces.
12. Implement real-time events, notifications and reliable asynchronous processing as required.
13. Integrate the shared API into the React Native application.
14. Implement the RAG knowledge pipeline and chat API only after its separate security and evaluation requirements are approved.
15. Complete security, concurrency, integration, load, backup/restore and production-readiness testing.

## Deployment and operations

Initial deployment should remain simple and portable:

- Dockerized Spring Boot application behind a reverse proxy or managed load balancer.
- Managed PostgreSQL where practical, with automated backups and tested restoration.
- Separate development, staging and production configuration.
- Flyway migrations executed as a controlled deployment step.
- Secrets supplied through environment/secret management, never committed to Git.
- Object storage for menu images, receipts and approved documents.
- Actuator/Micrometer metrics, centralized structured logs and alerting.
- Health/readiness checks, graceful shutdown and resource limits.
- CI pipeline for compilation, unit/integration tests, migration checks and artifact creation.
- Horizontal application scaling only after validating session/token behavior, WebSocket deployment strategy and database capacity.

Do not introduce Kubernetes, microservices, Redis or a message broker by default. Add infrastructure only when operational needs and measurements justify it.

## Shared API consumers: React web and React Native

This backend is the single shared application backend for both clients:

- **React website:** `mr-biryani/`
- **React Native app:** `react-native/`

Both clients integrate with the same `/api/v1` API surface and PostgreSQL source of truth. They share authentication, JWT/session policy, the seven predefined roles with customizable permission mappings, branch-aware authorization, validation, business rules, order/reservation/table/billing/payment workflows, audit logging and API error contracts.

### Non-negotiable integration rules

1. Do not build a second mobile backend, separate database or duplicate domain services.
2. Do not let either client connect directly to PostgreSQL.
3. Keep business rules, pricing/tax calculations, reservation/table allocation, order state transitions, payment verification and permission enforcement on the backend.
4. Keep UI presentation, navigation, local transient state and device capabilities in each client.
5. Expose client-neutral API contracts through OpenAPI; version breaking changes and maintain compatibility for supported web/mobile releases.
6. Use the same identity and role/permission source for both clients. Client route guards improve UX only; every protected API operation must authorize server-side.
7. Use the same idempotency, concurrency, audit and branch/ownership controls regardless of which client initiated a request.
8. If mobile requires push notifications, printing, camera, secure storage or offline queue support, implement device-specific adapters in the mobile app and use shared backend endpoints/events for business state.

Conceptual flow:

```text
React Website ───────┐
                     ├── HTTPS /api/v1 ── Shared Spring Boot backend
React Native App ────┘                          |
                                                ├── Shared authentication + seven-role RBAC
                                                ├── Shared domain modules and application services
                                                ├── PostgreSQL (source of truth)
                                                ├── WebSocket events / notifications
                                                └── Payment provider adapters
```

See [React Native implementation specification](../react-native/README.md).

## Repository documentation

- [RBAC specification](./docs/rbac.md)
- [Backend data-flow diagrams](./docs/data-flow-diagrams.md)
- [Frontend RBAC integration contract](../mr-biryani/docs/rbac-integration.md)
- [RAG chatbot architecture — planned](./docs/rag-chatbot-architecture.md)
- [React Native implementation specification](../react-native/README.md)

## Current implementation status

This repository documentation describes the target Spring Boot architecture and implementation plan. It does not establish that a production Spring Boot backend exists. The frontend currently contains mock OTP/localStorage demo authentication and prototype operational pages. No production JWT authorization engine, Spring Boot API, verified PostgreSQL migration set, payment integration or secure multi-device POS is claimed complete.
