# Mr. BIRIYANI — Backend

> **Status: Architecture and implementation plan.** The backend API, database migrations, authorization middleware, integrations and deployment are not yet claimed as implemented.

## Overview

The backend will serve the React customer website, management dashboard and multiple staff POS devices through a versioned REST API. PostgreSQL is the source of truth for restaurant operations. The initial architecture is a modular monolith with clear module boundaries, not microservices.

## Final architecture decisions

- Runtime/API: Node.js + Express.js, versioned under `/api/v1`.
- Database: PostgreSQL.
- Data access: Prisma ORM/migrations with parameterized SQL for profiled hot paths.
- Authentication: short-lived signed JWT access tokens; refresh-token rotation/revocation if persistent sessions are required.
- Authorization: seven predefined roles, customizable role-permission mappings, branch scope and resource-level policies.
- Validation: Zod; API contract: OpenAPI/Swagger.
- Logging: Pino; tests: Jest/Vitest + Supertest.
- Real-time: WebSockets for POS/kitchen notifications; PostgreSQL remains authoritative.
- Cache/queues: Redis only when justified by measured requirements.
- Packaging: Docker; monitoring, backups and restore tests required before production.

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

Branch model: single branch at launch, multi-branch ready from day one. Role model: seven protected predefined roles with Admin-customizable permission mappings. Do not introduce a generic `staff` role or additional standard role types.

See [Final RBAC specification](./docs/rbac.md) for permission catalogue, default role matrix, scope rules, data model, JWT policy, middleware, API authorization, security controls and acceptance criteria.

## Authorization principles

- Use stable `resource.action` permission keys, not scattered role-name checks.
- Public registration always creates Customer; never accept a role from the client.
- Manager can manage operational staff only within delegated scope; cannot grant Admin or edit role permission templates.
- Admin alone manages role permissions and system security configuration.
- Enforce branch scope, customer ownership and waiter/table/order assignment on the server.
- Separate refund initiation from approval; audit sensitive financial and administrative operations.
- Frontend route guards are usability controls, never security controls.
- JWT identifies the principal; current account status, permissions and scope are checked server-side.

## Application clients

| Client | Responsibility |
|---|---|
| Customer website | Registration/login, menu, online orders, profile, reservations and own history |
| Staff workspaces | Waiter, Receptionist, Captain and Cashier operational workflows |
| Manager dashboard | Assigned-branch staff operations, inventory, expenses and reports |
| Admin dashboard | Global user/role/permission, restaurant and integration administration |
| POS devices | Multiple registered devices with authenticated staff and branch context |
| Kitchen display | Kitchen ticket visibility and order-state updates, permission-scoped |

The frontend integration contract is documented in [Frontend RBAC integration](../mr-biryani/docs/rbac-integration.md). Current frontend authentication is a mock prototype and is not production RBAC.

## Planned backend modules

| Module | Responsibility |
|---|---|
| Auth and users | Registration, login, session lifecycle, profiles and account status |
| Roles and permissions | Seven role templates, assignments, permission evaluation and audit |
| Branches and devices | Branch scope, user assignments and POS device registration |
| Menu | Categories, items, variants, pricing and availability |
| Orders | Online/POS order lifecycle, immutable item snapshots and status history |
| Reservations | Availability, booking, check-in and lifecycle |
| Tables and sessions | Allocation, transfer, dining sessions and release |
| Kitchen/service | Tickets, preparation coordination and serving status |
| Billing and payments | Invoices, split billing, tender records, gateway adapter and refunds |
| Inventory and expenses | Stock movements, purchasing and expense controls |
| Reports | Branch-scoped sales, revenue and staff performance |
| Audit/notifications | Append-only audit trail and operational notifications |
| AI assistant / RAG | Approved knowledge ingestion, pgvector retrieval, grounded responses, citations, feedback and role-scoped read-only tools |

The existing restaurant ER diagram must be reviewed before finalizing physical schema, foreign keys and migrations.

## Data integrity and concurrency

- Use PostgreSQL transactions for order creation, table allocation, payment recording, inventory adjustments and role/permission updates.
- Use row-level locks/constraints for contested tables, reservations and stock.
- Use idempotency keys for retryable order/payment operations and webhook processing.
- Enforce unique gateway references, invoice numbers and relevant business keys in the database.
- Verify provider webhook signatures and amount/currency/reference/state before recording success.
- Persist state before emitting WebSocket notifications; use an outbox if reliable delivery is required.
- Store monetary amounts in appropriate fixed-precision numeric columns and retain order-item price/name snapshots.
- Store timestamps in UTC; localize for display.
- Apply branch filters in service/repository queries, not only in UI.

## Proposed API groups

All endpoints are under `/api/v1`; exact methods, payloads, pagination and response envelopes will be specified in OpenAPI.

- `/auth`: register, login, refresh, logout, current session.
- `/customers`: own profile and customer data.
- `/menu`: public reads and authorized management.
- `/orders`: online and POS orders, state transitions and tracking.
- `/reservations`: availability, create, confirm, update, check-in and cancel.
- `/tables`: availability, allocate, assign, transfer and release.
- `/staff`: staff records and responsibility assignments.
- `/kitchen`: tickets and preparation workflow.
- `/billing`, `/payments`: bills, split tenders, receipts, refunds and reconciliation.
- `/inventory`, `/expenses`: stock and expense operations.
- `/reports`: branch-scoped management reporting.
- `/admin/roles`, `/admin/permissions`, `/admin/settings`: Admin-only system configuration.
- `/chat`: shared conversation/session/message APIs, citations and feedback; authenticated private lookups remain owner/branch/assignment scoped.
- Admin knowledge-management APIs: source registration, ingestion, publish/rollback and evaluation; require explicit chatbot knowledge permissions.

Every protected route must declare required permission(s), branch policy and resource policy.

## Development roadmap

1. Verify ER diagram and finalize domain/data model.
2. Design PostgreSQL schema, constraints, indexes and RBAC seed templates.
3. Build backend foundation, configuration, logging, errors and migrations.
4. Implement authentication and refresh-token lifecycle.
5. Implement permission engine, branch scope, ownership and assignment policies.
6. Implement Admin role/permission management and Manager operational staff management.
7. Implement customer, menu, order and reservation APIs.
8. Implement Waiter, Receptionist and Captain floor/POS workflows.
9. Implement cashier billing, split payments, receipts, refunds and payment adapter.
10. Implement Manager reports, inventory and expenses.
11. Integrate frontend sessions, permissions, branch context and role-specific workspaces.
12. Implement the RAG knowledge pipeline, pgvector retrieval, model adapter, grounded chat API and admin publishing controls.
13. Integrate the shared chat API into React web and React Native clients.
14. Complete security, concurrency, RAG evaluation, integration, load and production-readiness testing.

## Payment provider

Razorpay, Zoho Payments and Cashfree remain candidates pending commercial and technical verification. Keep provider-specific behavior behind a provider-neutral adapter. Do not hardwire provider assumptions into order or billing modules.

## Repository documentation

- [RBAC specification](./docs/rbac.md)
- [Backend data-flow diagrams](./docs/data-flow-diagrams.md)
- [Frontend RBAC integration contract](../mr-biryani/docs/rbac-integration.md)

## Current implementation status

Documentation and architecture only. The frontend currently contains mock OTP/localStorage demo authentication and prototype operational pages. No production backend, JWT authorization engine, PostgreSQL migrations, payment integration or secure multi-device POS is claimed complete.


## Shared API consumers: React web and React Native

This backend is the single shared application backend for both clients:

- **React website:** `mr-biryani/`
- **React Native app:** `react-native/`

Both clients integrate with the same `/api/v1` API surface and PostgreSQL source of truth. They share authentication, JWT/session policy, the seven predefined roles with customizable permission mappings, branch-aware authorization, validation, business rules, order/reservation/table/billing/payment workflows, audit logging and API error contracts.

### Non-negotiable integration rules

1. Do not build a second mobile backend, separate database, or duplicate domain services.
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
                     ├── HTTPS /api/v1 ── Shared Node.js + Express backend
React Native App ────┘                          │
                                                ├── Shared auth + seven-role RBAC
                                                ├── Shared domain modules and services
                                                ├── PostgreSQL (source of truth)
                                                ├── Realtime events / notifications
                                                └── Payment provider adapters
```

See [React Native implementation specification](../react-native/README.md).


## RAG assistant (planned; not implemented)

See [RAG chatbot architecture](./docs/rag-chatbot-architecture.md) for the complete pipeline, API proposal, schema, security model, evaluation strategy and phased rollout. Key decisions:

- One shared Express chat module serves web and mobile; no separate AI backend per client.
- PostgreSQL + pgvector is the initial vector store, subject to extension/version verification and benchmark results.
- Ingest only approved, versioned restaurant knowledge (FAQs, policies, menu and verified allergen/branch information).
- Use embedding and LLM provider adapters; keep credentials server-side.
- Enforce public/private visibility, branch and role scopes before retrieval and tool calls.
- Use live authorized domain services for a customer's own order/reservation status; never vector-index private operational records.
- Initial assistant is read-only and cites sources. No autonomous order, payment, refund, reservation or inventory mutation.
- Track retrieval quality, groundedness, citation coverage, latency, token cost, feedback and safety regressions.


## RAG chatbot (initial implementation)

A retrieval-augmented restaurant information assistant is scaffolded in this backend:
- `POST /api/v1/chat` accepts a validated question and returns an answer with source metadata.
- OpenAI embeddings (`text-embedding-3-small`, 1536 dimensions) are stored in PostgreSQL using pgvector.
- Cosine-similarity retrieval selects published knowledge chunks; the LLM is instructed to answer only from retrieved context and abstain when context is insufficient.
- Knowledge sources live in `backend/knowledge/`; ingestion chunks Markdown/text, hashes chunks for idempotent upserts, generates embeddings, and indexes them.
- Rate limiting, request-size limits, Helmet, CORS allowlisting and server-side API-key configuration are included.

### Setup
1. Use PostgreSQL with the pgvector extension available.
2. Copy `.env.example` to `.env`, configure `DATABASE_URL`, `OPENAI_API_KEY` and allowed frontend origins.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run rag:ingest` to index approved knowledge files.
6. Run `npm run dev` and set `VITE_API_BASE_URL=http://localhost:4000/api/v1` in the React app.

### API contract
`POST /api/v1/chat`

Request: `{ "message": "Do you accept table reservations?" }`

Response: `{ "answer": "...", "sources": [{ "title": "...", "source": "...", "similarity": 0.8 }], "grounded": true }`

The chatbot is informational only. It does not perform order, payment, refund or reservation mutations and does not provide live operational status. Before production, integrate the existing authentication/RBAC middleware, enforce user/branch-aware retrieval where private documents are introduced, add conversation persistence only with an explicit retention policy, and run migrations/ingestion/integration tests. Do not ingest customer PII, payment data, secrets or unapproved internal documents.
