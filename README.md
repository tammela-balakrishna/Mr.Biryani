# Mr. BIRIYANI — House of Andhra Flavours

Restaurant ordering and management platform with a React frontend and a planned Node.js/Express/PostgreSQL backend.

## Repository structure

- `mr-biryani/` — React 19 + Vite customer-facing frontend and current prototype workspaces.
- `backend/` — Backend architecture, RBAC, data-flow diagrams and implementation plan.

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
- [Mobile APK build and Render deployment](./react-native/README.md#render-backend-and-apk)

## Important implementation status

The frontend currently includes prototype/mock authentication and browser-local demo data. This is not production authentication or secure RBAC. The backend and production authorization system remain planned work; see the implementation roadmap before treating any workflow as production-ready.

## Render backend and Android APK

The repository includes a Render Blueprint at [`render.yaml`](./render.yaml). In Render, choose **New > Blueprint**, connect this repository, and apply the Blueprint. It creates the Docker-based Spring backend and PostgreSQL database. After deployment, verify:

```text
https://<your-render-service>.onrender.com/actuator/health
```

The response must contain `"status":"UP"`. Set the required `JWT_SECRET` (at least 32 bytes) and any optional production credentials in the Render dashboard; never commit them.

Build the signed Android APK with EAS from [`react-native/`](./react-native/):

```powershell
cd react-native
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_BASE_URL --value https://<your-render-service>.onrender.com --environment preview --scope project
npx eas-cli@latest build --platform android --profile preview
```

Download the APK from the build URL printed by EAS. The `preview` profile produces an installable internal-distribution APK and uses the Render API URL at build time.
