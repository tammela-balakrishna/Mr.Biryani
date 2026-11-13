# Mr. BIRIYANI — House of Andhra Flavours

Restaurant ordering and management platform with a React frontend and a planned Node.js/Express/PostgreSQL backend.

## Repository structure

- `mr-biryani/` — React 19 + Vite customer-facing frontend and current prototype workspaces.
- `backend/` — Backend architecture, RBAC, data-flow diagrams and implementation plan.
- `react-native/` — React Native mobile application specification and implementation roadmap.

## Official application roles

1. Customer
2. Waiter
3. Receptionist
4. Captain
5. Cashier
6. Manager
7. Admin

The system is designed for seven predefined roles with customizable permissions and multi-branch readiness from day one. Public registration creates Customer only. Backend authorization must enforce permissions, ownership, branch scope and operational policies.

## Documentation

- [Backend architecture and implementation plan](./backend/README.md)
- [Final RBAC specification](./backend/docs/rbac.md)
- [Backend data-flow diagrams](./backend/docs/data-flow-diagrams.md)
- [Frontend RBAC integration contract](./mr-biryani/docs/rbac-integration.md)
- [React Native mobile implementation plan](./react-native/README.md)

## Important implementation status

The frontend currently includes prototype/mock authentication and browser-local demo data. This is not production authentication or secure RBAC. The backend and production authorization system remain planned work; see the implementation roadmap before treating any workflow as production-ready.
