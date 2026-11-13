# Frontend RBAC Integration Contract

**Status:** Design and migration requirements; current React app remains a prototype.

## Official roles

`customer`, `waiter`, `receptionist`, `captain`, `cashier`, `manager`, `admin`.

Do not use the former generic `staff` role. Role codes are stable identifiers. A user may have multiple explicitly assigned role/branch contexts, so the UI should consume the authenticated authorization context rather than infer access from one display role.

## Current prototype findings

The current frontend has mock OTP authentication in `src/utils/mockAuth.js`, stores its demo session in localStorage, seeds only Customer/Admin/generic Staff demo users, and uses role-name checks in Login, Navbar, AdminDashboard and StaffPOS. The POS screen combines order entry and payment selection, while Receptionist, Captain, Cashier and Manager do not yet have complete separate workspaces.

This is acceptable only as a local UI prototype. It is not a secure authentication or authorization implementation and must not be connected to production data as-is.

## Frontend authorization contract

The backend response should provide:
- user identity and account status;
- active role assignments;
- permission keys for the active context;
- authorized branch assignments and selected branch;
- authorization version/session metadata as needed.

Frontend responsibilities:
1. Centralize `hasPermission(key)`, `hasAnyPermission(keys)` and `canAccessResource(resource)` helpers.
2. Use protected route/layout components to improve navigation and prevent accidental access to irrelevant screens.
3. Use permission checks to show/hide individual actions.
4. Re-fetch or refresh authorization context after login, branch switch, role/permission changes and session refresh.
5. Handle 401 (re-authenticate), 403 (show access denied) and 409 (show state conflict).
6. Never trust localStorage roles, URL parameters, hidden controls or client-supplied branch IDs.
7. Backend authorization remains mandatory for every API operation.

## Proposed route/workspace map

| Route | Intended roles | Notes |
|---|---|---|
| `/`, `/menu`, `/about`, `/gallery`, `/contact` | Public | Browse content |
| `/login`, `/register` | Public | Registration creates Customer only |
| `/profile`, `/orders`, `/reservations` | Customer | Own resources only; staff reservation access uses staff workspace/API policies |
| `/staff/waiter` | Waiter | Assigned tables, order entry, kitchen dispatch and service status |
| `/staff/reception` | Receptionist | Reservations, availability, walk-ins, check-in and table allocation |
| `/staff/floor` | Captain | Floor view, waiter assignment and service coordination |
| `/staff/cashier` | Cashier | Bills, split payments, payment collection, receipts and authorized refunds |
| `/manager` | Manager | Branch-scoped staff operations, analytics, expenses, inventory and performance reports |
| `/admin` | Admin | System administration and role/permission configuration |

These are target routes, not a claim that the pages currently exist. Do not redirect all staff roles to the current generic `/staff/pos` screen.

## Required frontend refactor order

1. Add a canonical role/permission constants module matching backend permission keys.
2. Replace demo-only role checks with a centralized authorization context/provider.
3. Replace mockAuth with API-backed authentication; do not treat OTP demo constants as real authentication.
4. Add route guards and role-specific layouts.
5. Split current StaffPOS responsibilities: Waiter/Captain order entry and service; Cashier bill/payment operations; Receptionist reservation/table operations.
6. Add Manager and Admin workspaces with different administrative boundaries.
7. Add branch selector only for branches returned by the backend.
8. Add loading, unauthenticated, forbidden and session-expired states.
9. Add component/route tests for all seven roles and denied actions.

## Frontend test matrix

| Scenario | Expected UI behavior |
|---|---|
| Public registration | No role selector; account becomes Customer |
| Customer opens Admin route | Access denied / redirect |
| Waiter opens cashier workspace | Access denied unless explicitly granted required permission |
| Receptionist opens reservation workspace | Allowed for granted reservation permissions |
| Captain opens floor workspace | Allowed for floor permissions |
| Cashier opens cashier workspace | Allowed for billing/payment permissions |
| Manager opens manager workspace | Only assigned-branch management and reports |
| Admin opens role configuration | Allowed |
| Permission removed while logged in | UI refreshes authorization; API rejects stale access |
| Branch changed to unauthorized branch | Switch rejected and data cleared/refetched |

## Non-negotiable security boundary

The frontend is not the security boundary. A modified browser can call APIs directly. All permissions, ownership, branch scope, assignment scope and business-state checks must be enforced by Express services/middleware.


## RAG chatbot frontend integration (planned)

The website chatbot is a client of the shared backend chat module; it must not call an LLM provider or vector database directly. The React Native client uses the same `/api/v1/chat` contract.

- Public visitors may ask only about explicitly public menu, FAQ, policy and branch content.
- Signed-in Customers may request their own order/reservation information only through backend-authorized live domain services.
- Staff assistance must be limited by the same seven-role permissions, branch scope and assignment scope as the operational UI.
- Admin knowledge-management UI requires explicit `chat.knowledge.read`, `chat.knowledge.manage` and `chat.knowledge.publish` permissions.
- Render source citations, loading/streaming, retry, empty/unknown-answer, error and feedback states.
- Do not treat hidden UI controls as authorization; every chat endpoint and tool call is checked server-side.
- Do not expose provider keys, embeddings, internal prompts, other users' conversations or raw retrieved private records to the browser.
- Initial UI scope is read-only. No generated response may trigger order placement, table allocation, payment, refund or inventory mutation.

This is a target integration contract, not an implemented chatbot component. See [RAG chatbot architecture](../../backend/docs/rag-chatbot-architecture.md).
