# MyScholarship

MyScholarship is a scholarship and internship discovery website with a public opportunity desk and a private publishing dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the separate API server
- `pnpm --filter @workspace/myscholarship run dev` — run the separate React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI
- `pnpm --filter @workspace/db run push` — push development database schema

The API server uses the workspace PostgreSQL database through `DATABASE_URL`. Optional admin overrides are `ADMIN_USERNAME` and `ADMIN_PASSWORD`; development defaults are the credentials requested for the first admin account.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query
- Backend: Express 5
- Database: PostgreSQL + Drizzle ORM
- Validation: OpenAPI-generated Zod schemas
- API codegen: Orval

## Where things live

- `artifacts/myscholarship/src/` — public React app and private admin screens
- `artifacts/api-server/src/routes/opportunities.ts` — auth, public listing, admin CRUD, dashboard summary
- `lib/api-spec/openapi.yaml` — source of truth for frontend/backend API contracts
- `lib/db/src/schema/index.ts` — opportunities database schema
- `lib/api-client-react/src/generated/` — generated React Query hooks

## Architecture decisions

- Frontend and backend are separate workspace artifacts but share one OpenAPI contract and generated client.
- Opportunities are stored in PostgreSQL; `eligibleCountries` is kept as a JSON array so country filtering remains simple and flexible.
- Admin sessions use an HTTP-only cookie and server-side session set; admin-only routes never expose drafts publicly.
- Local image selection works in the admin form and stores a data URL for portable VS Code development; remote image URLs are also supported.

## Product

- Public scholarship and internship listings with search, country, deadline, and “last 24 hours” filters.
- Detail pages with eligibility, benefits, required documents, deadline, and application link.
- Private admin login, dashboard metrics, draft/published workflow, image selection, edit, delete, and recent activity.

## Gotchas

- Run codegen after every OpenAPI change before typechecking the frontend.
- Restart both managed workflows after backend or toolchain changes.
- The frontend uses the generated hooks from `@workspace/api-client-react`; do not hand-write a second API client.