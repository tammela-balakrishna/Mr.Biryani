# Mr. BIRIYANI — Backend Data-Flow Diagrams

These Mermaid diagrams document the planned data movement through the Mr. BIRIYANI restaurant management backend. They are architecture documentation, not evidence of implemented services or database tables.

## Diagram index

1. [Level 0 — System context](#level-0--system-context)
2. [Level 1 — Backend processes](#level-1--backend-processes)
3. [Level 2 — Authentication and RBAC](#level-2--authentication-and-rbac)
4. [Level 2 — Online customer order](#level-2--online-customer-order)
5. [Level 2 — Offline POS and billing](#level-2--offline-pos-and-billing)
6. [Level 2 — Reservation workflow](#level-2--reservation-workflow)
7. [Level 2 — Payment workflow](#level-2--payment-workflow)

---

## Level 0 — System context

The backend is represented as one process interacting with external actors and providers.

```mermaid
flowchart TB
    C[Customer]
    A[Admin]
    S[Restaurant Staff]
    POS[Multiple POS Devices]

    SYSTEM((Mr. BIRIYANI Backend))

    DB[(PostgreSQL)]
    PG[Payment Gateway]
    MSG[SMS / Notification Provider]
    K[Kitchen Display System]

    C -->|Registration, login, orders, reservations| SYSTEM
    SYSTEM -->|Menu, order status, booking confirmation| C

    A -->|Management requests| SYSTEM
    SYSTEM -->|Dashboard and reports| A

    S -->|POS orders, billing, table operations| SYSTEM
    POS -->|POS requests| SYSTEM
    SYSTEM -->|Order updates and table status| POS

    SYSTEM -->|Read and write| DB
    DB -->|Persisted records| SYSTEM

    SYSTEM <-->|Payment requests and verified results| PG
    SYSTEM <-->|Notifications| MSG
    SYSTEM -->|Kitchen tickets and order updates| K
```

**Data ownership:** PostgreSQL is the persistent source of truth. Frontend clients do not directly access the database.

## Level 1 — Backend processes

This decomposes the backend into its major functional processes and data stores.

```mermaid
flowchart TB
    C[Customer]
    A[Admin]
    S[Staff / POS]

    P1((1.0 Authentication and RBAC))
    P2((2.0 Menu Management))
    P3((3.0 Order Management))
    P4((4.0 POS and Table Management))
    P5((5.0 Reservation Management))
    P6((6.0 Payment Management))
    P7((7.0 Dashboard and Reporting))
    P8((8.0 Kitchen Management))

    D1[(Users and Roles)]
    D2[(Menu and Categories)]
    D3[(Orders and Order Items)]
    D4[(Tables and Sessions)]
    D5[(Reservations)]
    D6[(Payments and Invoices)]
    D7[(Audit Logs)]
    D8[(Kitchen Tickets)]

    PG[Payment Gateway]
    N[Notification Provider]

    C -->|Credentials| P1
    A -->|Credentials| P1
    S -->|Credentials| P1
    P1 <--> D1
    P1 -->|Access token and identity| C
    P1 -->|Access token and identity| A
    P1 -->|Access token and identity| S

    C -->|Browse menu| P2
    A -->|Manage menu| P2
    P2 <--> D2

    C -->|Online order| P3
    P3 <--> D3
    P3 -->|Validate item and price| D2

    S -->|POS order| P4
    P4 <--> D3
    P4 <--> D4
    P4 -->|Create kitchen ticket| P8

    C -->|Reservation request| P5
    S -->|Reservation operations| P5
    P5 <--> D5
    P5 <--> D4

    P3 -->|Payment request| P6
    P4 -->|Offline tender record| P6
    P6 <--> D6
    P6 <-->|Payment request and verification| PG
    P6 -->|Payment notification| N

    A -->|Dashboard request| P7
    P7 --> D3
    P7 --> D5
    P7 --> D6
    P7 -->|Reports| A

    P8 <--> D8

    P3 --> D7
    P4 --> D7
    P5 --> D7
    P6 --> D7
```

Authentication and authorization are cross-cutting controls: every protected process must verify the caller's identity and permissions before performing an operation.

## Level 2 — Authentication and RBAC

```mermaid
flowchart TD
    U[Customer / Staff / Admin]
    UI[React Frontend]

    P1((1.1 Receive credentials))
    P2((1.2 Validate input))
    P3((1.3 Hash or verify password))
    P4((1.4 Resolve authorized role))
    P5((1.5 Issue signed JWT))
    P6((1.6 Verify JWT and claims))
    P7((1.7 Check permissions))

    D1[(Users)]
    D2[(Roles and User Roles)]
    D3[(Permissions and Role Permissions)]
    API[Protected API endpoint]

    U --> UI
    UI -->|Registration or login| P1
    P1 --> P2
    P2 -->|Valid input| P3
    P3 <-->|Password hash| D1
    P3 -->|Verified identity| P4
    P4 <--> D2
    P4 --> P5
    P5 -->|Access token| UI

    UI -->|Bearer token| P6
    P6 -->|Verified identity and claims| P7
    P7 <--> D3
    P7 -->|Allowed| API
    P7 -->|Denied| UI
```

**Controls:** Public registration assigns only the `customer` role. Staff/admin accounts are provisioned through an authorized process. JWT signature, algorithm, issuer, audience and expiry are verified. Client-supplied roles are never trusted.

## Level 2 — Online customer order

```mermaid
flowchart TD
    C[Customer]
    UI[Customer Website]

    P1((3.1 Submit cart))
    P2((3.2 Validate menu items))
    P3((3.3 Calculate server-side prices))
    P4((3.4 Create order transaction))
    P5((3.5 Initiate online payment))
    P6((3.6 Verify gateway webhook))
    P7((3.7 Update payment and order state))
    P8((3.8 Notify customer))

    D1[(Menu Items)]
    D2[(Orders)]
    D3[(Order Item Snapshots)]
    D4[(Payments)]

    PG[Payment Gateway]
    N[Notification Service]

    C --> UI
    UI --> P1
    P1 --> P2
    P2 <--> D1
    P2 --> P3
    P3 --> P4
    P4 -->|Atomic write| D2
    P4 -->|Historical item and price snapshot| D3
    P4 --> P5
    P5 <-->|Gateway payment request| PG
    PG -->|Signed webhook| P6
    P6 -->|Verified amount, currency and reference| P7
    P7 --> D4
    P7 --> D2
    P7 --> P8
    P8 --> N
    P8 -->|Order confirmation| UI
```

The frontend redirect is not proof of payment. The backend verifies the gateway webhook signature and transaction details before recording a successful payment. Webhook processing must be idempotent.

## Level 2 — Offline POS and billing

```mermaid
flowchart TD
    POS1[Staff POS Device 1]
    POS2[Staff POS Device 2]
    POSN[Staff POS Device N]

    P1((4.1 Authenticate staff and device))
    P2((4.2 Select order type))
    P3((4.3 Check and allocate table))
    P4((4.4 Create POS order))
    P5((4.5 Create kitchen ticket))
    P6((4.6 Record offline tender))
    P7((4.7 Generate invoice))
    P8((4.8 Complete table session))

    D1[(Users, Roles and Devices)]
    D2[(Restaurant Tables)]
    D3[(Orders and Order Items)]
    D4[(Kitchen Tickets)]
    D5[(Payments)]
    D6[(Invoices)]
    D7[(Table Sessions)]

    K[Kitchen Display]
    LIVE[Other POS Clients]

    POS1 --> P1
    POS2 --> P1
    POSN --> P1
    P1 <--> D1
    P1 --> P2

    P2 -->|Dine-in| P3
    P2 -->|Takeaway or walk-in| P4
    P3 <--> D2
    P3 -->|Transactional allocation| P4

    P4 --> D3
    P4 --> P5
    P5 --> D4
    P5 --> K

    P4 --> P6
    P6 --> D5
    P6 --> P7
    P7 --> D6

    P7 -->|Bill| POS1
    P7 -->|Bill| POS2
    P7 -->|Bill| POSN

    P7 --> P8
    P8 --> D7
    P8 -->|Release table after session completion| D2

    D3 -->|Persisted state change events| LIVE
```

**Concurrency controls:** Use transactions and row-level locking or equivalent constraints for table allocation. Use idempotency keys for retried requests and unique constraints for invoice and payment references. WebSocket events notify other POS clients after the database transaction commits.

## Level 2 — Reservation workflow

```mermaid
flowchart TD
    C[Customer]
    UI[Reservation Interface]

    P1((5.1 Submit date, time and party size))
    P2((5.2 Validate reservation request))
    P3((5.3 Check table and booking availability))
    P4((5.4 Create reservation))
    P5((5.5 Staff confirms or rejects))
    P6((5.6 Seat guest and start table session))
    P7((5.7 Complete reservation))

    D1[(Reservations)]
    D2[(Restaurant Tables)]
    D3[(Table Sessions)]

    S[Staff / Admin]
    N[Notification Service]

    C --> UI
    UI --> P1
    P1 --> P2
    P2 --> P3
    P3 <--> D1
    P3 <--> D2
    P3 -->|Available slots| UI

    UI -->|Booking request| P4
    P4 --> D1
    P4 --> N

    S -->|Confirm or reject| P5
    P5 <--> D1
    P5 --> N

    S -->|Guest arrives| P6
    P6 --> D3
    P6 --> D2

    P6 --> P7
    P7 --> D1
    P7 --> D2
```

Availability must be rechecked during the transactional write, not only during the earlier availability lookup. A confirmed reservation does not make a table occupied; the actual dining session does.

## Level 2 — Payment workflow

```mermaid
flowchart TD
    O[Order Service]
    POS[POS Service]

    P1((6.1 Receive payment request))
    P2((6.2 Validate order and amount))
    P3((6.3 Select payment method))
    P4((6.4 Process online payment))
    P5((6.5 Record POS tender))
    P6((6.6 Verify gateway result))
    P7((6.7 Record payment state))
    P8((6.8 Update order financial state))

    D1[(Orders)]
    D2[(Payments)]
    D3[(Invoices)]

    PG[Payment Gateway]
    N[Notification Service]

    O --> P1
    POS --> P1
    P1 --> P2
    P2 <--> D1
    P2 --> P3

    P3 -->|Online| P4
    P3 -->|Cash, UPI or card at POS| P5

    P4 <-->|Payment request| PG
    PG -->|Signed webhook| P6
    P5 --> D2
    P6 --> P7
    P5 --> P7
    P7 --> D2
    P7 --> P8
    P8 --> D1
    P8 --> D3
    P8 --> N
```

The payment service should expose a provider-neutral adapter interface. Provider selection (Razorpay, Zoho Payments or Cashfree) remains a separate commercial and technical decision. Offline tender records and online gateway transactions should share a consistent payment domain model without pretending they have identical verification flows.

---

## Cross-cutting data-flow rules

- **PostgreSQL is authoritative:** WebSocket messages are notifications, not durable records.
- **Server-calculated totals:** Never trust prices, discounts, taxes or totals supplied by a browser/POS client without server-side validation.
- **Atomic operations:** Orders, table allocation, inventory deductions and payment state changes require appropriate transactions and constraints.
- **Idempotency:** Design retry-safe order creation, payment initiation and webhook processing.
- **Auditability:** Record sensitive administrative and financial state changes with actor, action, target and timestamp.
- **Branch context:** Scope operational queries and authorization to the active branch once branch support is finalized.
- **Privacy:** Avoid placing secrets or unnecessary personal/payment data in tokens, events or logs.

## Implementation order

1. Verify the existing ER diagram and finalize the relational schema.
2. Establish backend foundation, PostgreSQL configuration and migrations.
3. Implement authentication and RBAC.
4. Implement menu and customer APIs.
5. Implement orders, POS, tables and billing.
6. Implement payment adapters and webhook verification.
7. Implement reservations and kitchen workflows.
8. Implement reporting, audit, tests and production operations.
