# Mr. BIRIYANI — React Native Mobile Application

> **Document status:** Mobile implementation specification and delivery plan only. No React Native application, source code, dependencies, native projects or mobile build configuration have been created by this document.

## 1. Purpose

Build a cross-platform iOS and Android application for **Mr. BIRIYANI — House of Andhra Flavours**, using the existing React website as the product and workflow reference and the planned Node.js/Express/PostgreSQL backend as the system of record.

The mobile app should reuse the restaurant's established customer journey and business rules while providing native navigation, touch-first layouts, device capabilities and role-aware staff workspaces.

The mobile app must not copy the web prototype's browser storage or mock authentication as its production data layer.

## 2. Repository and source review

The current web client is in `mr-biryani/` and uses:

- React 19, Vite 8 and React Router 7.
- Tailwind CSS 4 for styling.
- `lucide-react` icons.
- Page-based customer journeys: Home, Menu, Order, Login, Register, Profile, Order History, Reservations, About, Gallery and Contact.
- Prototype staff/admin pages: Admin Dashboard, Staff POS and a role workspace placeholder.
- Demo data and authentication helpers under `src/utils/`.

Observed frontend product information:

| Existing web area | Mobile requirement |
|---|---|
| Home | Brand introduction, featured biryanis, promotions and primary menu/order actions |
| Menu | Category browsing, item cards, product images, prices and add-to-cart |
| Order/cart | Cart quantity changes, order type, customer details, delivery address where applicable, instructions and checkout |
| Login/register | Indian mobile-number based customer journey in the current prototype; replace mock OTP with backend-approved authentication |
| Profile | Customer account and account-related actions |
| Order history | Customer's own order list and order detail/status |
| Reservations | Date, time, guest count, occasion and special request submission; reservation status |
| Staff POS | Existing prototype combines dine-in/takeaway/walk-in order entry, table selection and payment preference |
| Admin dashboard | Existing prototype shows order metrics, orders, table status and reservation requests |
| Role workspace | Current placeholder identifies Waiter, Receptionist, Captain, Cashier and Manager responsibilities |

### Important findings and migration constraints

- The menu currently contains hardcoded Biryani, Family Pack and Starters categories and item/price data in the web page. The POS demo has a separate hardcoded menu list. Production mobile menu data must come from the backend; avoid maintaining two competing catalogues.
- Web cart, mock users, orders, reservations and table demo data use browser `localStorage`. React Native must not use browser APIs. Production state must be loaded from backend APIs and persisted only where explicitly required for secure session handling or offline capability.
- The current OTP is a fixed demo value and must never be reused in production.
- The current order and reservation flows explicitly state that they are local demos and do not notify the restaurant, take payments or confirm real availability.
- The current Staff POS combines order creation and payment preference. Mobile implementation must separate Waiter/Captain order operations from Cashier billing and payment operations.
- The Admin Dashboard and staff role workspace are prototypes/placeholders, not complete production workspaces.
- Existing web UI styles and components are not directly reusable as native components. Reuse brand assets, wording, information architecture and business rules; implement native layouts and interaction patterns.

## 3. Product scope and user roles

The mobile app is planned as one role-aware application with distinct navigation and capabilities. Backend authorization is authoritative; the app only adapts the interface to the permissions returned by the API.

### Seven official roles

| Role | Mobile workspace and principal capabilities |
|---|---|
| Customer | Register/authenticate, browse menu, place online orders, reserve tables, track own orders/reservations, view own history/bills and receive personalized recommendations |
| Waiter | View assigned tables, create/modify permitted orders, send orders to kitchen, update serving status and view assigned table details |
| Receptionist | Check table availability, create/manage reservations, check in guests, allocate tables and register walk-ins |
| Captain | View floor operations, assign waiters, monitor orders and kitchen coordination, manage permitted reservation/service operations |
| Cashier | Generate bills, collect/record payments, split payments, print/reprint receipts and process authorized refunds/cancellations |
| Manager | View branch-scoped analytics, sales/revenue, operational staff, responsibilities, expenses, inventory and staff performance |
| Admin | Manage users/managers, roles and permissions, restaurant settings, menu/pricing/tax, integrations, security and system configuration |

Role codes are fixed: `customer`, `waiter`, `receptionist`, `captain`, `cashier`, `manager`, `admin`.

The standard role catalogue contains exactly these seven roles. Admin may customize permission mappings for the predefined roles. Manager cannot grant Admin or edit role permission templates. Public registration always creates Customer; never include a role selector in customer registration.

Full permissions, branch scoping, ownership rules and separation of duties are specified in [backend RBAC](../backend/docs/rbac.md).

## 4. Recommended mobile technology baseline

Use **React Native with Expo and TypeScript** unless a native capability or deployment constraint discovered during implementation requires a bare React Native workflow.

| Concern | Recommended choice | Reason |
|---|---|---|
| Runtime | React Native + Expo | Shared iOS/Android development and managed native capabilities |
| Language | TypeScript, strict mode | Typed API contracts and safer role/state modelling |
| Navigation | Expo Router | File-based routes, nested layouts and deep-link support |
| Server state | TanStack Query | API caching, request lifecycle, retries and invalidation |
| Local UI state | Zustand or React Context for small state | Keep transient state separate from server state |
| Forms | React Hook Form + Zod | Consistent validation and typed form schemas |
| Secure credentials | Expo SecureStore | Store refresh/session secrets using platform secure storage |
| Networking | Fetch or Axios behind a typed API client | Centralized headers, error mapping, timeouts and token refresh |
| Lists | FlatList/SectionList; FlashList only if profiling justifies it | Efficient long menus, orders and staff lists |
| Icons | Lucide React Native or Expo-compatible icon set | Consistent visual language |
| Notifications | Expo Notifications with backend push integration | Order, reservation and operational notifications |
| Images | Expo Image | Image caching and native image loading |
| Testing | Jest + React Native Testing Library; Maestro for E2E | Unit/component and device-flow coverage |
| Build/release | EAS Build and EAS Submit | Repeatable iOS/Android builds and delivery |

Pin compatible package versions during project setup. Confirm current Expo SDK and native package compatibility at implementation time; this document intentionally does not prescribe unverified version numbers.

## 5. Application navigation and screen map

Use role-specific route groups/layouts, not one giant screen with many role conditionals.

### Public and customer journey

- Welcome/Home
- Menu categories and menu item details
- Search/filter and featured recommendations
- Cart
- Checkout and order confirmation
- Login, registration, OTP verification and session recovery
- Customer profile
- Order history and order detail/tracking
- Reservation create, reservation history and reservation detail
- Bill/receipt viewing
- Notifications and preferences
- About, Gallery and Contact

### Staff workspaces

**Waiter**
- Assigned tables
- Table/session detail
- Create/edit permitted order
- Send order to kitchen
- Order/serving status

**Receptionist**
- Reservation calendar/list
- Availability lookup
- Reservation create/update
- Guest check-in
- Walk-in registration
- Table allocation and current table status

**Captain**
- Live floor overview
- Table and order monitoring
- Waiter assignment
- Reservation/service coordination
- Kitchen coordination overview

**Cashier**
- Open bills and payment due
- Generate bill
- Split bill/tender
- Record cash/card/UPI payment as supported by backend policy
- Receipt view/print/share
- Authorized refund/cancellation workflow

**Manager**
- Branch dashboard
- Sales/revenue analytics
- Staff list and operational account actions
- Staff responsibility assignment
- Reservation overview
- Inventory and expense summaries/actions
- Staff performance reports

**Admin**
- Global administration overview
- User and manager management
- Role/permission configuration
- Menu, pricing and tax configuration
- Restaurant and branch settings
- Payment/notification integration configuration
- Security and audit views

Admin screens can be limited on mobile if a complex configuration task is better handled in the existing web dashboard. The backend permission model must remain consistent across web and mobile.

## 6. Backend integration contract

The backend is planned as Node.js + Express + PostgreSQL with a modular REST API under `/api/v1`. The mobile app must consume that API rather than connect directly to PostgreSQL or use browser mock helpers.

Expected API domains:

| API domain | Mobile usage |
|---|---|
| `/auth` | Register, login, OTP/identity verification as configured, refresh, logout, current session |
| `/customers` | Own profile and customer details |
| `/menu` | Categories, items, variants, availability, images and prices |
| `/orders` | Online/POS order creation, own order history, order detail and status |
| `/reservations` | Availability, create, update, cancel, check-in and reservation status |
| `/tables` | Table availability, allocation, assignment, transfer and release |
| `/staff` | Staff profiles and responsibility assignments |
| `/kitchen` | Kitchen tickets and order preparation coordination |
| `/billing` | Bills, split bills and receipts |
| `/payments` | Payment intents, tender records, refunds and reconciliation |
| `/inventory`, `/expenses` | Manager operational functions |
| `/reports` | Branch-scoped analytics and performance |
| `/admin/roles`, `/admin/permissions`, `/admin/settings` | Admin-only configuration |

Exact endpoint paths, request/response shapes, pagination, error envelopes and WebSocket events must be agreed in OpenAPI before mobile feature implementation.

### Authorization contract

After authentication, the API should return the user's identity, active role assignments, permission keys, authorized branch assignments and selected branch context.

- Use permission keys from the backend, not hardcoded role-only UI logic.
- Apply route and action guards for usability, but treat API authorization as the security boundary.
- Customer resources must be owner-scoped.
- Waiter records must be assignment-scoped.
- Staff and Manager access must be branch-scoped.
- Admin global access must be explicitly granted.
- Validate selected branch with the server; never trust a client-provided branch ID.
- Handle 401 (session invalid/expired), 403 (not authorized), 409 (business conflict) and validation errors consistently.
- On permission/branch changes, refresh authorization context and invalidate affected cached queries.

See [backend API and architecture plan](../backend/README.md) and [frontend RBAC integration contract](../mr-biryani/docs/rbac-integration.md).

## 7. Mobile data and state management

Separate three categories of state:

1. **Server state:** menu, prices, availability, orders, reservations, tables, bills, staff assignments, reports and permissions. Fetch and mutate through API services and TanStack Query.
2. **Ephemeral UI state:** open tabs, selected filters, modal state, form input and temporary cart interactions. Keep in local component state or a small UI store.
3. **Secure session state:** tokens/session credentials and minimal session metadata. Use platform secure storage for credentials; never store raw passwords or refresh tokens in ordinary AsyncStorage/local storage.

Cart persistence may be implemented as a recoverable local draft, but the backend must recalculate price, taxes, discounts, delivery fees and availability at checkout. Do not treat client totals as authoritative.

Do not duplicate the same server entity in multiple independent stores. Define query keys and invalidation rules for menu, cart/checkout, orders, reservations, tables and reports.

## 8. Authentication, security and privacy

- Customer registration creates Customer only.
- Staff accounts are provisioned by authorized Admin; Manager receives only delegated operational staff capabilities.
- Never accept a role or permission assignment from a public registration request.
- Use backend-issued short-lived JWT access tokens and the agreed refresh-token rotation/revocation mechanism.
- Keep refresh tokens in SecureStore or another approved platform secure storage mechanism; do not put credentials in logs, analytics or crash reports.
- Do not hardcode OTPs, API secrets, payment keys or signing secrets in the app bundle.
- Use TLS for all production API traffic.
- Apply device-level biometric unlock only as an optional convenience gate, not a replacement for server authentication.
- Protect sensitive screens and redact customer/payment details in logs and notifications.
- Enforce role, branch, ownership and assignment policies on the backend for every operation.
- Provide logout, session expiry, account suspension and lost-device revocation behavior.
- Use privacy-aware permissions for notifications, camera, location and Bluetooth/printer access; request only when the feature requires it.

## 9. Orders, reservations, POS and payment rules

### Customer orders

- Load menu and availability from API.
- Keep item identifiers and quantities in the cart; server reloads current price and validates stock/availability at checkout.
- Support the current web product concepts: Biryani, Family Pack and Starters, while allowing backend-driven categories.
- Support configured fulfilment modes such as delivery and takeaway; confirm dine-in customer ordering rules with the backend.
- Show order reference, current status and order history.
- Do not show “confirmed” or “paid” until backend state confirms it.

### Reservations

- Collect date, time, guest count, occasion and special requests, matching the current web form.
- Availability is checked by backend and rechecked transactionally when booking.
- A requested/confirmed reservation does not itself mark a table occupied. Table occupancy starts with a dining session.
- Display the actual reservation status returned by the server.

### Staff POS

- Support multiple authenticated POS devices and branch context.
- Separate order entry (Waiter/Captain) from billing/payment (Cashier).
- Receptionist manages reservation/check-in/table allocation; Captain supervises floor and waiter assignment.
- Use server-side transactions and concurrency checks for table allocation and order updates.
- Do not rely on a device-local table list as the authoritative source.

### Payments

- Keep gateway-specific code behind backend payment APIs/adapters.
- Razorpay, Zoho Payments and Cashfree remain candidates; no provider is finalized by this mobile plan.
- Never store raw card data.
- Use provider-approved SDK/hosted checkout where applicable and verify payment status through backend-confirmed provider events.
- Cash, card and UPI POS tender support must follow the backend's payment/tender contract.
- Refund initiation and approval are separate permissions and must be reflected in UI.
- Support split payments only through backend bill/payment state transitions and idempotent requests.

## 10. Real-time updates and notifications

Use backend WebSocket or push-notification contracts for:
- Customer order status changes.
- Reservation confirmation/cancellation and reminders.
- Waiter order/table updates.
- Captain floor and service coordination.
- Kitchen ticket/order status changes.
- Cashier bill/payment state changes.
- Manager operational alerts.

WebSocket events and push notifications are signals to refresh server state; they are not authoritative transaction records. Reconnect safely, deduplicate event handling and re-fetch critical resources after reconnect.

## 11. Offline and connectivity strategy

Initial release should be **online-first** for order placement, payment, reservation, table allocation and other contested operations. Provide graceful offline states and retry-safe reads where appropriate.

If offline POS order capture is later required, treat it as a separate scoped feature:
- Define an explicit offline order queue and sync protocol.
- Use client-generated idempotency identifiers.
- Define conflict handling for menu price changes, table allocation, inventory and duplicate submissions.
- Never claim an offline payment is settled without verified payment evidence.
- Show queued, syncing, synced and failed states.
- Test multi-device reconnection and duplicate delivery.

Do not implement an offline-first database or background sync before the business rules and conflict policy are approved.

## 12. Proposed project structure

This is the target structure for a future mobile project; it has not been created yet.

```text
react-native/
├── README.md
├── app/
│   ├── _layout.tsx
│   ├── (public)/
│   ├── (customer)/
│   ├── (waiter)/
│   ├── (receptionist)/
│   ├── (captain)/
│   ├── (cashier)/
│   ├── (manager)/
│   └── (admin)/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints/
│   │   └── contracts/
│   ├── auth/
│   ├── authorization/
│   ├── components/
│   ├── config/
│   ├── features/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── reservations/
│   │   ├── tables/
│   │   ├── kitchen/
│   │   ├── billing/
│   │   ├── payments/
│   │   ├── staff/
│   │   ├── inventory/
│   │   └── reports/
│   ├── hooks/
│   ├── navigation/
│   ├── notifications/
│   ├── storage/
│   ├── theme/
│   ├── types/
│   └── utils/
├── assets/
├── tests/
└── app.config.ts
```

Organize by feature and keep API, domain rules, presentation and platform integration separated. Avoid giant role-based components and avoid duplicating business logic across role screens.

## 13. Brand and design direction

Carry forward the existing web identity:
- Brand name: Mr. BIRIYANI — House of Andhra Flavours.
- Primary visual direction: dark/black surfaces with warm gold accents; current web uses `#080808`, `#111010` and `#D4A63A` in many screens.
- Food photography and menu item imagery are prominent.
- Typography should preserve the premium restaurant feel while prioritizing native readability.
- Use native safe areas, keyboard handling, touch target sizes, loading/empty/error states and accessible labels.
- Respect system font scaling, screen readers, reduced motion and platform navigation conventions.

Treat these as design references, not a requirement to reproduce every web animation or desktop layout on a phone.

## 14. Testing and quality gates

### Unit and component tests
- Price/quantity display and cart calculations (display only; server recalculates).
- Form validation for mobile, reservation and checkout.
- Permission helper behavior and role-specific navigation.
- API error mapping, retry policy and session expiry.
- Empty, loading, offline and error states.

### Integration and end-to-end tests
- Customer register/login/logout and session refresh.
- Customer menu, cart, checkout, order history and order tracking.
- Reservation request, server confirmation and cancellation.
- Waiter assigned-table restriction and kitchen dispatch.
- Receptionist check-in and concurrent table allocation.
- Captain waiter assignment and floor visibility.
- Cashier split payment, receipt and authorized refund workflow.
- Manager branch-scoped reporting and staff management.
- Admin role permission changes and audit visibility.
- Branch switching, revoked permissions and suspended accounts.
- Duplicate submit, network timeout, retry and webhook-driven payment status.

### Release gates
- All seven roles have explicit route/action coverage.
- Every protected action is rejected by the backend when unauthorized, even if invoked directly.
- No demo OTP or mock localStorage workflow is present in production builds.
- No secrets are bundled in the application.
- iOS and Android builds pass on supported OS/device targets.
- Accessibility, crash reporting, analytics privacy and app-store disclosures are reviewed.
- API contract and mobile version compatibility are documented.

## 15. Implementation roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 0. Contract readiness | Confirm API OpenAPI contract, auth, RBAC, branch context, order/reservation/payment state machines | Backend contracts reviewed and versioned |
| 1. Mobile foundation | Expo/TypeScript project, navigation, theme, environment config, API client, error handling, tests and CI | Builds run on iOS and Android |
| 2. Authentication | Login/register, secure session lifecycle, role/permission context and branch selection | No mock auth; session and access tests pass |
| 3. Customer experience | Home, menu, item detail, cart, checkout, profile and history | Backend-backed customer flows pass |
| 4. Reservations and notifications | Availability, booking, reservation history, push/deep links | Server-confirmed reservation states |
| 5. Waiter and Receptionist | Assigned tables, order entry/dispatch, check-in and table allocation | Assignment and concurrency tests pass |
| 6. Captain and Cashier | Floor supervision, waiter assignment, billing, split tenders, receipts and refund policies | Separation-of-duty tests pass |
| 7. Manager and Admin | Analytics, staff operations, inventory/expenses, role settings and audit | Branch/global scope tests pass |
| 8. Real-time and resilience | WebSockets, push notifications, reconnect and retry/idempotency | Duplicate and reconnect tests pass |
| 9. Release hardening | Security, performance, accessibility, device testing, EAS builds and store readiness | Release checklist approved |

## 16. Decisions to confirm before implementation

The following items are not sufficiently determined by the current web prototype and must be agreed before the related mobile phase:

1. **App distribution:** one public app for customers and staff, or separate customer and staff apps sharing code and backend?
2. **Staff/Admin mobile scope:** which Admin settings and Manager reports must be usable on mobile versus web-only?
3. **Customer fulfilment:** confirm delivery, takeaway and whether customer-initiated dine-in ordering is supported.
4. **Authentication:** OTP provider, fallback/recovery policy, and whether staff use phone OTP, password, or managed credentials.
5. **Payments:** final provider, supported online payment methods, refund rules and receipt requirements.
6. **Printing:** supported receipt printers, connection type (Bluetooth/LAN/USB) and supported Android/iOS devices.
7. **Offline POS:** online-only first release or offline order capture requirement; if offline, define conflict and reconciliation rules.
8. **Branch behavior:** branch selection policy for multi-branch staff and customer branch/location selection.
9. **Notifications:** SMS, WhatsApp, push and email providers and event templates.
10. **Minimum device/OS support:** target Android/iOS versions, tablet support and supported screen sizes.

Do not block the initial mobile foundation on decisions that do not affect it, but do not implement the affected workflows until the relevant decision is approved.

## 17. Current status and boundaries

- This README records the reviewed web product scope, approved seven-role RBAC direction and proposed mobile architecture.
- It does not create a React Native app or install dependencies.
- It does not claim backend APIs, PostgreSQL schema, JWT authentication, payment processing, printing, push notifications or offline sync are implemented.
- The web frontend remains the current prototype reference; mock authentication and local browser data must be replaced by backend services.
- Mobile development should begin only after Phase 0 contracts are agreed with the backend plan.

## Related repository documents

- [Web frontend](../mr-biryani/)
- [Backend architecture and roadmap](../backend/README.md)
- [Seven-role RBAC specification](../backend/docs/rbac.md)
- [Backend data-flow diagrams](../backend/docs/data-flow-diagrams.md)
- [Web frontend RBAC integration contract](../mr-biryani/docs/rbac-integration.md)


## Shared backend with the React website

**The React website and this React Native app use one shared backend.** The mobile app is not a separate product backend and must not introduce its own API server, database, authentication implementation, RBAC policy or duplicate business logic.

- React web client: `../mr-biryani/`
- Shared backend: `../backend/`
- Mobile client: this `react-native/` project

Both clients consume the same versioned `/api/v1` HTTPS endpoints and share the same PostgreSQL source of truth, authentication/session lifecycle, seven-role permission assignments, branch scoping, validation contracts, order/reservation/table/billing/payment workflows, audit rules and real-time event semantics.

Only presentation and device-specific concerns differ. React Native owns native navigation, secure device storage, push notification registration, printer/Bluetooth integration where supported, and mobile offline UX. The backend owns identity, authorization, business rules, transactional state changes, payment verification and durable records. Do not implement pricing, taxes, table allocation, reservation confirmation, payment settlement or role authorization as trusted client-side logic.

### Shared API integration rule

OpenAPI is the contract consumed by both clients. Keep request/response schemas, pagination, error codes and event payloads client-neutral. A feature implemented in one client should be available to the other through the same backend capability and permission policy, subject to the client UI scope. Use backward-compatible API evolution or explicit versioning so a mobile release does not break the deployed web client (and vice versa).

```text
React Website ───────┐
                     ├── HTTPS /api/v1 ── One shared backend ── PostgreSQL
React Native App ────┘                       │
                                             ├── Auth + seven-role RBAC
                                             ├── Orders / reservations / POS
                                             ├── Billing / payments / inventory
                                             └── Realtime events / notifications
```


## RAG chatbot integration (planned)

The mobile app will expose a native chat screen backed by the **same shared `/api/v1/chat` module** used by the React website. Do not add a separate mobile LLM integration, vector database or chatbot backend.

- Initial customer experience: menu questions, verified ingredient/spice/allergen details, restaurant FAQs, policies and public branch information.
- Use the common conversation/message API, source citations, feedback and optional server-sent event streaming contract.
- Public users receive public knowledge only. Signed-in customers can request their own order/reservation status only through authenticated live backend services.
- Staff-facing help must respect the existing seven roles and branch/assignment permissions. Admin knowledge publishing remains permission-gated.
- Keep chat history in server-owned sessions; local cache must be treated as disposable and privacy-aware.
- Show source references, uncertainty/unknown answers, retry/offline states and a way to report poor answers.
- Do not expose model keys or connect directly to PostgreSQL/pgvector.
- First release is read-only; generated text cannot place orders, reserve tables, collect payments, issue refunds or change inventory.

Suggested feature folder: `src/features/chat/` with screen/components, typed API hooks, message list, composer, citation renderer and feedback controls. Keep retrieval, embeddings, model prompts and authorization entirely on the backend.

Implementation phases: shared API contract → chat UI shell → public FAQ/menu pilot → authenticated owner-scoped status tools → evaluation and staged rollout. Full backend architecture, schema proposal, threat model and acceptance criteria: [RAG chatbot architecture](../backend/docs/rag-chatbot-architecture.md).

**Status:** specification only. No mobile chat screen or RAG backend is claimed implemented.
