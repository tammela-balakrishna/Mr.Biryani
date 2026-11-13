# Mr. BIRIYANI — Backend Data-Flow Diagrams

**Status:** Approved target architecture; diagrams describe planned flows, not implemented services or tables.

## Diagram index

1. [Level 0 — System context](#level-0--system-context)
2. [Level 1 — Backend processes](#level-1--backend-processes)
3. [Level 2 — Authentication and seven-role RBAC](#level-2--authentication-and-seven-role-rbac)
4. [Level 2 — Online customer order](#level-2--online-customer-order)
5. [Level 2 — Offline POS and billing](#level-2--offline-pos-and-billing)
6. [Level 2 — Reservation workflow](#level-2--reservation-workflow)
7. [Level 2 — Payment workflow](#level-2--payment-workflow)
8. [Level 2 — Branch and resource authorization](#level-2--branch-and-resource-authorization)
9. [Level 2 — RAG assistant query and ingestion](#level-2--rag-assistant-query-and-ingestion)

## Level 0 — System context

```mermaid
flowchart TB
    C[Customer]
    W[Waiter]
    R[Receptionist]
    CP[Captain]
    CA[Cashier]
    M[Manager]
    A[Admin]
    POS[Multiple POS Devices]
    API((Mr. BIRIYANI API))
    DB[(PostgreSQL)]
    PG[Payment Provider]
    MSG[Notification Provider]
    K[Kitchen Display]

    C <-->|Menu, own orders, reservations, bills| API
    W <-->|Assigned tables, orders, service status| API
    R <-->|Reservations, walk-ins, check-in, tables| API
    CP <-->|Floor, waiter assignments, coordination| API
    CA <-->|Bills, tenders, receipts, authorized refunds| API
    M <-->|Operations, inventory, expenses, reports| API
    A <-->|Users, roles, permissions, settings| API
    POS <-->|Authenticated POS requests and updates| API
    API <-->|Transactional data| DB
    API <-->|Payment intents and verified webhooks| PG
    API <-->|Notifications| MSG
    API -->|Kitchen tickets and updates| K
```

All clients use the API. PostgreSQL is the durable source of truth; browser state and WebSocket messages are not authoritative records.

## Level 1 — Backend processes

```mermaid
flowchart TB
    ACT[Customer / Waiter / Receptionist / Captain / Cashier / Manager / Admin]
    AUTH((1. Authentication and Authorization))
    MENU((2. Menu))
    ORDER((3. Order Management))
    FLOOR((4. POS, Tables and Sessions))
    RES((5. Reservations))
    KITCHEN((6. Kitchen and Service))
    BILL((7. Billing and Payments))
    MGMT((8. Management and Reports))
    ADMIN((9. System Administration))
    BRANCH((10. Branch and Device Context))

    D1[(Users, Roles, Permissions)]
    D2[(Branches and Assignments)]
    D3[(Menu)]
    D4[(Orders and Items)]
    D5[(Tables and Sessions)]
    D6[(Reservations)]
    D7[(Kitchen Tickets)]
    D8[(Bills and Payments)]
    D9[(Inventory and Expenses)]
    D10[(Audit Logs)]

    ACT --> AUTH
    AUTH <--> D1
    AUTH <--> D2
    AUTH --> MENU
    AUTH --> ORDER
    AUTH --> FLOOR
    AUTH --> RES
    AUTH --> KITCHEN
    AUTH --> BILL
    AUTH --> MGMT
    AUTH --> ADMIN
    BRANCH <--> D2
    MENU <--> D3
    ORDER <--> D4
    ORDER --> D3
    FLOOR <--> D4
    FLOOR <--> D5
    RES <--> D6
    RES <--> D5
    KITCHEN <--> D7
    BILL <--> D8
    BILL --> D4
    MGMT --> D4
    MGMT --> D6
    MGMT --> D8
    MGMT <--> D9
    ADMIN <--> D1
    ADMIN --> D10
    ORDER --> D10
    FLOOR --> D10
    RES --> D10
    BILL --> D10
```

Every protected process passes authentication, permission evaluation, branch scope, resource ownership/assignment and business-state validation.

## Level 2 — Authentication and seven-role RBAC

```mermaid
flowchart TD
    CLIENT[React Customer / Staff / Manager / Admin Client]
    LOGIN((1. Receive registration or login))
    VALID((2. Validate input and account status))
    HASH((3. Verify password or identity proof))
    ROLE((4. Resolve role assignments))
    BRANCH((5. Resolve authorized branch context))
    TOKEN((6. Issue short-lived signed JWT))
    VERIFY((7. Verify JWT signature and claims))
    PERM((8. Evaluate current permission mapping))
    SCOPE((9. Check ownership, branch and assignment scope))
    POLICY((10. Validate business-state policy))
    API[Protected API operation]
    DENY[401 / 403 / 409 response]
    U[(Users)]
    UR[(User Roles)]
    RP[(Role Permissions)]
    P[(Permissions)]
    B[(Branches and User Branch Assignments)]
    AUDIT[(Audit Logs)]

    CLIENT --> LOGIN --> VALID
    VALID <--> U
    VALID --> HASH
    HASH --> ROLE
    ROLE <--> UR
    ROLE --> BRANCH
    BRANCH <--> B
    BRANCH --> TOKEN
    TOKEN -->|Access token| CLIENT
    CLIENT -->|Bearer token| VERIFY
    VERIFY --> PERM
    PERM <--> RP
    RP <--> P
    PERM --> SCOPE
    SCOPE -->|Record and branch policy| API
    API --> POLICY
    POLICY -->|Allowed| AUDIT
    POLICY -->|Rejected| DENY
    VERIFY -->|Invalid token| DENY
    PERM -->|Missing permission| DENY
    SCOPE -->|Out of scope| DENY
```

### Seven standard roles

- CUSTOMER — own profile, orders, reservations and bills.
- WAITER — assigned tables, permitted order operations, kitchen dispatch and serving.
- RECEPTIONIST — reservations, check-in, walk-ins and table allocation.
- CAPTAIN — floor supervision, waiter assignment and service coordination.
- CASHIER — billing, split tenders, receipts and authorized refunds.
- MANAGER — operational staff, branch-scoped reports, inventory and expenses.
- ADMIN — user/role/permission administration, settings, integrations and security.

Public registration always assigns CUSTOMER. Admin may customize permission mappings for these seven protected predefined roles. Manager cannot edit role permissions or grant Admin.

## Level 2 — Online customer order

```mermaid
flowchart TD
    C[Customer] --> UI[Customer Website]
    UI --> AUTH[Authenticate and verify Customer role]
    AUTH --> OWN[Validate customer ownership and request]
    OWN --> MENU[Reload menu availability and prices]
    MENU <--> D1[(Menu)]
    MENU --> TX[Create order transaction]
    TX --> O[(Orders)]
    TX --> I[(Immutable Order Item Snapshots)]
    TX --> PAY[Create payment intent]
    PAY <--> PG[Payment Provider]
    PG --> WH[Verify signed webhook]
    WH --> IDEM[Idempotency and amount/currency/reference checks]
    IDEM --> P[(Payments)]
    IDEM --> O
    O --> N[Notify customer and operational clients]
```

Client-submitted prices are never authoritative. Browser redirect is not proof of payment. Webhook processing is verified and idempotent.

## Level 2 — POS, table and billing workflow

```mermaid
flowchart TD
    W[Waiter / Captain] --> AUTH[Authenticate, device and branch checks]
    AUTH --> ASSIGN[Check table/order assignment and permission]
    ASSIGN --> TYPE[Select dine-in / takeaway / walk-in]
    TYPE --> TABLE[Check and allocate table transactionally]
    TABLE <--> T[(Tables)]
    TYPE --> ORDER[Create or modify permitted order]
    TABLE --> ORDER
    ORDER --> O[(Orders and Item Snapshots)]
    ORDER --> K[Create kitchen ticket]
    K --> KT[(Kitchen Tickets)]
    K --> DISPLAY[Kitchen Display]
    CA[Cashier] --> CASH[Cashier permission and branch check]
    CASH --> BILL[Generate or split bill]
    BILL --> INV[(Invoices)]
    BILL --> TENDER[Collect and record payment]
    TENDER --> PAY[(Payments)]
    TENDER --> REFUND[Separate authorized refund workflow]
    REFUND --> PAY
    PAY --> CLOSE[Complete session under closure policy]
    CLOSE --> TS[(Table Sessions)]
    CLOSE --> T
    O --> EVENTS[Post-commit events to other POS devices]
```

Waiter/Captain order entry and Cashier billing/payment are separate capabilities. Do not expose a single generic POS screen as equivalent access for all staff roles.

## Level 2 — Reservation workflow

```mermaid
flowchart TD
    C[Customer] --> REQ[Submit date, time, party size]
    R[Receptionist] --> REQ
    REQ --> AUTH[Permission, branch and ownership checks]
    AUTH --> AVAIL[Check capacity and booking conflicts]
    AVAIL <--> RES[(Reservations)]
    AVAIL <--> TABLE[(Tables)]
    AVAIL --> TX[Transactional availability recheck and booking write]
    TX --> RES
    TX --> CONF[Confirmation policy]
    CONF --> NOTIFY[Customer notification]
    G[Guest arrives] --> CHECKIN[Receptionist check-in]
    CHECKIN --> ALLOC[Allocate table]
    ALLOC --> SESSION[Start dining session]
    SESSION --> TS[(Table Sessions)]
    SESSION --> TABLE
```

A confirmed reservation does not itself occupy a table. Actual occupancy starts with a dining session. Availability must be rechecked inside the booking transaction.

## Level 2 — Payment and refund workflow

```mermaid
flowchart TD
    ORDER[Order / Bill] --> REQ[Payment request]
    REQ --> VALID[Validate amount, currency, branch and payable state]
    VALID --> METHOD{Payment method}
    METHOD -->|Online| GATEWAY[Provider adapter]
    GATEWAY --> WEBHOOK[Verify signed provider webhook]
    METHOD -->|Cash / POS UPI / Card| TENDER[Cashier records tender]
    WEBHOOK --> IDEM[Idempotency and unique provider reference]
    TENDER --> IDEM
    IDEM --> PAY[(Payments)]
    PAY --> STATE[Update invoice and order financial state]
    STATE --> AUDIT[(Audit Logs)]
    REFUND[Refund request] --> INIT[Check payments.refund]
    INIT --> APPROVE[Independent approval if policy requires]
    APPROVE --> PROVIDER[Provider refund or POS reversal workflow]
    PROVIDER --> PAY
    PROVIDER --> AUDIT
```

Keep the payment provider behind an adapter. Razorpay, Zoho Payments and Cashfree remain candidates. Online gateway verification and offline tender recording are distinct flows.

## Level 2 — Branch and resource authorization

```mermaid
flowchart TD
    REQ[Authenticated API request] --> USER[Load active user and role assignments]
    USER --> BRANCH[Resolve selected branch]
    BRANCH --> CHECK{Branch explicitly assigned?}
    CHECK -->|No| DENY[403 Forbidden]
    CHECK -->|Yes| PERM{Required permission granted?}
    PERM -->|No| DENY
    PERM -->|Yes| RESOURCE{Resource policy}
    RESOURCE --> OWN[Customer owns record]
    RESOURCE --> ASSIGNED[Staff assigned to table/order/task]
    RESOURCE --> MANAGER[Manager has branch scope]
    RESOURCE --> ADMIN[Admin global scope]
    OWN --> POLICY[Business-state validation]
    ASSIGNED --> POLICY
    MANAGER --> POLICY
    ADMIN --> POLICY
    POLICY -->|Valid| SERVICE[Execute service transaction]
    POLICY -->|Invalid| CONFLICT[409 Conflict]
```

Global access is reserved for explicitly authorized Admin operations. Manager reports and staff management are branch-scoped. Waiter access is assignment-scoped. Customer records are ownership-scoped.

## Cross-cutting data-flow rules

- PostgreSQL is authoritative; browser storage and WebSocket events are not.
- Validate permissions and data scope on every protected request.
- Use server-calculated prices, discounts, tax and totals.
- Use transactions and concurrency controls for tables, reservations, inventory and payments.
- Use idempotency for retryable writes and gateway webhooks.
- Audit sensitive security, staff and financial changes.
- Persist state before publishing real-time events.
- Scope operational records and reports by branch.
- Do not log passwords, tokens, payment secrets or unnecessary personal data.

## Implementation order

1. Review the existing ER diagram and finalize relational schema.
2. Establish PostgreSQL/Prisma foundation and migrations.
3. Implement authentication and seven-role RBAC.
4. Implement branch, ownership and assignment policies.
5. Implement menu, customer and order modules.
6. Implement reservation, table, POS and kitchen workflows.
7. Separate Cashier billing/payment/refund operations.
8. Implement Manager reporting, inventory and expenses.
9. Integrate frontend role-aware workspaces and API authorization context.
10. Complete security, concurrency, integration and production-readiness tests.


## Level 2 — RAG assistant query and ingestion

**Planned flow only; no chatbot services or vector index are implemented yet.**

### Query flow

```mermaid
flowchart TD
    WEB[React Website] --> API[POST /api/v1/chat/sessions/:id/messages]
    MOB[React Native App] --> API
    API --> AUTH[Authenticate or allow public-only mode]
    AUTH --> RATE[Rate limit and validate input]
    RATE --> INTENT[Classify intent and data sensitivity]
    INTENT -->|Public FAQ/menu/policy| EMBED[Create query embedding]
    EMBED --> RETRIEVE[Hybrid retrieval with visibility/locale/branch filters]
    RETRIEVE <--> VDB[(PostgreSQL + pgvector knowledge chunks)]
    RETRIEVE --> RERANK[Optional bounded reranking]
    INTENT -->|Private order/reservation status| DOMAIN[Authorized live domain service]
    DOMAIN --> SCOPE[Enforce user ownership, branch and assignment]
    SCOPE --> CONTEXT[Permitted context only]
    RERANK --> CONTEXT
    CONTEXT --> LLM[LLM provider adapter]
    LLM --> GROUND[Ground answer and attach source citations]
    GROUND --> RESP[Response / optional SSE stream]
    RESP --> WEB
    RESP --> MOB
    API --> LOG[Privacy-minimized metrics, feedback and audit]
    GROUND --> LOG
```

### Knowledge ingestion flow

```mermaid
flowchart TD
    ADMIN[Authorized Admin / Content Publisher] --> SOURCE[Approved FAQ, menu, policy and branch sources]
    SOURCE --> NORMALIZE[Normalize text and metadata]
    NORMALIZE --> CHUNK[Semantic chunking and content hash]
    CHUNK --> EMB[Embedding provider adapter]
    EMB --> INDEX[(PostgreSQL + pgvector)]
    INDEX --> EVAL[Retrieval and grounding evaluation]
    EVAL -->|Approved| PUBLISH[Publish version]
    EVAL -->|Rejected| HOLD[Hold for correction]
    PUBLISH --> RETRIEVE[Available to filtered retrieval]
```

### RAG safety boundaries

- Retrieved text is untrusted context, not executable instructions.
- Apply authorization filters before retrieval results reach the model; prompt wording is not an access-control mechanism.
- Private order/reservation data is fetched live through the domain service and owner-scoped, never from the general vector index.
- First release exposes no mutating tools. Model output cannot create orders, allocate tables, collect payments or issue refunds.
- Only approved, versioned sources can be published; deletions/expiry must deactivate stale chunks.
- Both clients use the same chat API and permission policy.
