# Mr. BIRIYANI — Mobile app (React Native / Expo)

Status: **one role-aware app.** Customers get menu, cart, orders, reservations and the assistant. Staff get the floor, orders, cashier and reports tabs, each shown only with its permission. Push notifications, printing, payments, biometric unlock, offline support and end-to-end tests are not built yet (see [Scope](#scope)).

This app is a client of the shared backend in `../backend/` (`/api/v1`). It does not have its own server, database, authentication or business rules.

## Stack

- Expo SDK 58, React Native 0.88, TypeScript (strict)
- Expo Router (routes in `src/app/`, per `AGENTS.md`)
- TanStack Query for server state; React context for auth and the in-memory cart
- Expo SecureStore for the refresh token (iOS Keychain / Android Keystore)
- Zod for response contracts; Jest + React Native Testing Library for tests

## Run it

```bash
npm install
cp .env.example .env            # optional: point the app at your API
npx expo start                  # then press a for Android or i for iOS
```

The API defaults to `http://localhost:8080`. Android emulators reach the host at `http://10.0.2.2:8080`, so set `EXPO_PUBLIC_API_BASE_URL` for that case. Start the backend first (`docker compose -p mrbiryani-final up -d` in `../backend`).

Checks:

```bash
npx tsc --noEmit    # typecheck
npx jest            # unit tests
npx expo lint
npx expo-doctor
```

## Security rules for this app

- No secrets, API keys, signing keys or OTP values in the code or in `EXPO_PUBLIC_*` variables. Those variables ship inside the app bundle.
- The refresh token is the only long-lived credential, and it lives only in SecureStore. Passwords and access tokens are never written to disk.
- Every request sends `X-Client-Type: native`. The backend then returns the refresh token in the JSON body instead of a browser cookie. The app stores it and sends it back on refresh and logout.
- Permission checks in the app only decide what to show. The backend rejects anything the user is not allowed to do.
- Public registration always creates a Customer. There is no role field in the registration form.

## Scope

Built:

- Sign in, registration, session restore and automatic token refresh (one retry, then sign-out)
- Customer tabs: live menu by category, cart with quantity changes, checkout with an idempotency key per attempt, order history with the status the server reports, reservations (request, list, cancel; the rules match the backend), and the assistant chat with citations and helpful/not-helpful feedback. Anonymous visitors can use the assistant; signed-in sessions are private to their owner
- Route guards from Expo Router `Stack.Protected` (usability only)
- Unit tests for the API client (error mapping, refresh-and-retry, no refresh loops), permission helpers and cart rules

Not built yet (each needs a decision or contract from the spec's section 16, or a later phase):

- Deep links: the scheme `mrbiryani://` is registered and routes match the screen paths (for example `mrbiryani:///menu`), but no link is tested on a device
- Staff workspaces: floor tables (status and waiter assignment, for staff with the permission), live orders (step-by-step kitchen and service), cashier (bill and cash/card/UPI tenders), reception (today's reservations: confirm and check-in), manager (stock with low-stock flags, stock adjustments, expense entry, recent expenses) and sales report. Still missing: walk-in registration, refunds, receipts, approving expenses, and the Admin area (use the web dashboard)
- Staff use the first active branch returned by the API; a multi-branch picker is not built
- Payments and receipts. The app never states an order is paid unless the server says so
- Real-time updates (WebSocket)
- Offline behaviour: the cart is in memory only, so it is lost when the app closes
- Biometric unlock and printing (need the device and printer decisions)
- Live updates cover staff order screens only. Other screens poll
- Push notifications
- Refund requests from the app (approval is in the manager tab; requesting is still web-only)
- E2E tests (Maestro). Build profiles are in `eas.json`; no EAS build has been run

## Layout

```
app/                      (this project keeps routes in src/app/)
src/app/                  routes: _layout, index, login, register, (customer)/{menu,cart,orders,account}
src/api/                  typed request helper, endpoints and response contracts
src/auth/                 auth provider and secure refresh-token storage
src/authorization/        pure permission helpers and the customer permission keys
src/features/cart/        cart rules (pure) and the in-memory cart provider
src/features/data/        TanStack Query hooks and query keys
src/components/           shared UI primitives
src/theme/                brand colours from the website
tests/unit/               Jest tests
```

## Backend changes this app needed

- `X-Client-Type: native` on auth endpoints returns the refresh token in the body and accepts it in the body. Browser clients keep the HTTP-only cookie. Covered by `NativeAuthIntegrationTest` in the backend.
- `GET /api/v1/branches` (public) lists active branches.

## Build profiles

`eas.json` defines `development`, `preview` and `production` builds. Run them with `npx eas-cli@latest build -p android --profile preview` after `npx eas-cli@latest login` and project setup. Signing credentials are managed by EAS and are not stored in this repository.

These changes still need approval from the security review, because the spec leaves the refresh-token mechanism to be agreed.
