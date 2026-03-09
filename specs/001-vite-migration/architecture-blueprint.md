# Architecture Blueprint: Monolith → Vite Frontend + Node Backend

**Feature Branch**: `001-vite-migration`
**Created**: 2025-07-18
**Status**: Approved
**Input**: Migration plan structure todo — repository/storage design after splitting Next.js monolith

---

## 1. Monorepo vs Multi-Repo Decision

### Decision: **Monorepo (npm workspaces)**

| Factor | Monorepo | Multi-Repo | Verdict |
|---|---|---|---|
| **Team Velocity** | Single `git clone`, atomic cross-package changes, one PR for feature + API | Context switching between repos, separate PRs for coordinated changes | ✅ Monorepo — solo/small team, faster iteration |
| **CI/CD** | Single pipeline, selective builds via `--filter`, shared test infra | Independent pipelines, simpler per-service but harder to coordinate releases | ✅ Monorepo — current project has one CI pipeline; keep it simple |
| **Shared Types** | `packages/shared` imported directly, always in sync, compile-time safety | Published as npm package, version drift risk, publish-before-use friction | ✅ Monorepo — `src/types/` (errors.ts, insights.ts, news.types.ts) and `src/lib/calculations/` are used by both frontend and backend today |
| **Deployment Independence** | Deploy each workspace independently via separate build scripts; Vercel/Railway support workspace-aware deploys | Naturally independent | ≈ Tie — monorepo with workspace deploys achieves the same result |
| **Prisma Schema Sharing** | Single `prisma/` at root, both apps reference it | Duplicated schema or git submodule | ✅ Monorepo — Prisma is a single source of truth |

### Rationale

The current codebase is a single `package.json` monolith where **services** (`src/services/`) are backend code imported by both legacy API handlers and potentially by frontend components (through data fetching). The types in `src/types/` and calculation utilities in `src/lib/calculations/` are genuinely shared between frontend display logic and backend business logic. A monorepo with npm workspaces preserves this tight coupling during migration while enabling independent deployment later.

Multi-repo would force premature decisions about type publishing, create version sync overhead for a 1-2 person team, and add friction to the migration process itself (can't make atomic "move file + update imports" commits).

---

## 2. Recommended Target Structure

```
stock_operation_system/              # Monorepo root
├── package.json                     # Workspace root (npm workspaces)
├── tsconfig.base.json               # Shared TS compiler options
├── prisma/                          # Database schema (shared, unchanged)
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── apps/
│   ├── frontend/                    # Vite React SPA
│   │   ├── package.json             # deps: react, react-dom, react-router-dom, recharts, axios
│   │   ├── tsconfig.json            # extends ../../tsconfig.base.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── public/
│   │   └── src/
│   │       ├── main.tsx             # Entry: BrowserRouter + RouterProvider
│   │       ├── routes.tsx           # Route definitions
│   │       ├── app/                 # Page components (from current src/app/)
│   │       │   ├── (auth)/          # login, register
│   │       │   ├── dashboard/
│   │       │   ├── portfolios/
│   │       │   ├── transactions/
│   │       │   ├── strategy-builder/
│   │       │   ├── technical-analysis/
│   │       │   ├── fibonacci-tool/
│   │       │   ├── backtest-results/
│   │       │   ├── globals.css
│   │       │   └── page.tsx         # Home page
│   │       ├── components/          # React components (from current src/components/)
│   │       │   ├── ui/
│   │       │   ├── portfolio/
│   │       │   ├── charts/
│   │       │   ├── news/
│   │       │   ├── stocks/
│   │       │   └── transactions/
│   │       ├── hooks/               # React hooks (from current src/hooks/)
│   │       ├── layouts/             # Layout components (from current src/layouts/)
│   │       ├── lib/                 # Frontend-only utilities
│   │       │   └── utils/
│   │       │       ├── toast.ts
│   │       │       └── date-filters.ts
│   │       └── types/               # Frontend-only types (if any)
│   │
│   └── backend/                     # Node.js API server (Express)
│       ├── package.json             # deps: express, @prisma/client, bcrypt, decimal.js, axios
│       ├── tsconfig.json            # extends ../../tsconfig.base.json
│       ├── src/
│       │   ├── server.ts            # Express app entry point
│       │   ├── routes/              # Express route registrations
│       │   │   ├── index.ts         # Route aggregator
│       │   │   ├── auth.routes.ts
│       │   │   ├── portfolios.routes.ts
│       │   │   ├── transactions.routes.ts
│       │   │   ├── stocks.routes.ts
│       │   │   ├── indicators.routes.ts
│       │   │   ├── strategies.routes.ts
│       │   │   ├── news.routes.ts
│       │   │   ├── risk-assessment.routes.ts
│       │   │   ├── realized-pl.routes.ts
│       │   │   ├── holding-advice.routes.ts
│       │   │   ├── dashboard.routes.ts
│       │   │   └── sync.routes.ts
│       │   ├── controllers/         # Request/response handling (from backend/next-api-legacy/ handlers)
│       │   │   ├── auth.controller.ts
│       │   │   ├── portfolios.controller.ts
│       │   │   ├── transactions.controller.ts
│       │   │   ├── stocks.controller.ts
│       │   │   ├── indicators.controller.ts
│       │   │   ├── strategies.controller.ts
│       │   │   ├── news.controller.ts
│       │   │   ├── risk-assessment.controller.ts
│       │   │   ├── realized-pl.controller.ts
│       │   │   ├── holding-advice.controller.ts
│       │   │   ├── dashboard.controller.ts
│       │   │   └── sync.controller.ts
│       │   ├── middleware/           # Express middleware (from backend/next-api-legacy/lib/)
│       │   │   ├── auth.middleware.ts       # Session validation (from middleware.ts)
│       │   │   ├── error-handler.ts         # Centralized error handling (from error-handler.ts)
│       │   │   └── cors.ts
│       │   ├── services/            # Business logic (from current src/services/)
│       │   │   ├── auth.service.ts
│       │   │   ├── portfolio.service.ts
│       │   │   ├── transaction.service.ts
│       │   │   ├── stock.service.ts
│       │   │   ├── rsi.service.ts
│       │   │   ├── macd.service.ts
│       │   │   ├── bollinger-bands.service.ts
│       │   │   ├── atr.service.ts
│       │   │   ├── fibonacci.service.ts
│       │   │   ├── support-resistance.service.ts
│       │   │   ├── candlestick-pattern.service.ts
│       │   │   ├── technical-score.service.ts
│       │   │   ├── indicator-cache.service.ts
│       │   │   ├── indicator-optimization.service.ts
│       │   │   ├── chart.service.ts
│       │   │   ├── strategy.service.ts
│       │   │   ├── news.service.ts
│       │   │   ├── sentiment-analysis.service.ts
│       │   │   ├── credibility.service.ts
│       │   │   ├── dashboard-news.service.ts
│       │   │   ├── dashboard-news-sync.service.ts
│       │   │   ├── risk-assessment.service.ts
│       │   │   ├── holding-advice.service.ts
│       │   │   ├── realized-pl.service.ts
│       │   │   └── tax-lot.service.ts
│       │   └── lib/                 # Backend-only utilities
│       │       ├── api/             # External API clients (from src/lib/api/)
│       │       │   ├── finnhub-client.ts
│       │       │   ├── alpha-vantage-client.ts
│       │       │   └── rate-limiter.ts
│       │       ├── csv/             # CSV parsing (from src/lib/csv/)
│       │       └── db/              # Prisma client (from src/lib/db/)
│       │           ├── prisma.ts
│       │           └── index.ts
│       └── tests/                   # Backend tests
│           ├── unit/                # Service unit tests
│           ├── property/            # Property-based tests (fast-check)
│           ├── integration/         # API integration tests
│           └── __tests_api__/       # Route-level tests (from backend/next-api-legacy/__tests_api__/)
│
├── packages/
│   └── shared/                      # Shared code between frontend and backend
│       ├── package.json             # name: @stock-system/shared
│       ├── tsconfig.json            # extends ../../tsconfig.base.json
│       └── src/
│           ├── index.ts             # Barrel export
│           ├── types/               # Shared type definitions
│           │   ├── errors.ts        # (from src/types/errors.ts)
│           │   ├── insights.ts      # (from src/types/insights.ts)
│           │   ├── news.types.ts    # (from src/types/news.types.ts)
│           │   └── api.types.ts     # Request/response shapes for API contract
│           ├── constants/           # Shared constants
│           │   ├── news-sources.ts  # (from src/constants/news-sources.ts)
│           │   └── sentiment-keywords.ts  # (from src/constants/sentiment-keywords.ts)
│           ├── calculations/        # Financial math (from src/lib/calculations/)
│           │   ├── decimal-utils.ts
│           │   └── calculation-service.ts
│           └── validation/          # Shared validation rules
│               └── validation.ts    # (from src/lib/utils/validation.ts)
│
├── scripts/                         # Operational scripts (unchanged)
│   ├── backfill-realized-pl.ts
│   ├── backfill-tax-lots.ts
│   ├── sync-dashboard-news.ts
│   └── validate-insights.ts
│
├── docs/                            # Documentation (unchanged)
├── specs/                           # Feature specs (unchanged)
├── .github/                         # CI/CD workflows
└── tailwind.config.ts               # Shared Tailwind config (referenced by frontend)
```

### Workspace Configuration (root `package.json`)

```json
{
  "name": "stock-portfolio-system",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/frontend",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:all": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

---

## 3. Migration Path

### Phase 0: Scaffolding (No Behavior Change)

**Goal**: Create the monorepo directory skeleton without moving any code.

1. Create `apps/frontend/`, `apps/backend/`, `packages/shared/` directories.
2. Create root `tsconfig.base.json` extracting shared compiler options from current `tsconfig.json`.
3. Create workspace-level `package.json` files with correct dependency splits:
   - `apps/frontend/package.json`: react, react-dom, react-router-dom, recharts, tailwindcss, axios
   - `apps/backend/package.json`: express, @prisma/client, bcrypt, decimal.js, axios, papaparse
   - `packages/shared/package.json`: decimal.js (peer dep)
4. Add `"workspaces"` to root `package.json`.
5. Verify `npm install` succeeds at root.

### Phase 1: Extract Shared Package

**Goal**: Move genuinely shared code to `packages/shared/` so both apps can import it.

| Current Location | Target Location | Rationale |
|---|---|---|
| `src/types/errors.ts` | `packages/shared/src/types/errors.ts` | Used by frontend error display + backend error handler |
| `src/types/insights.ts` | `packages/shared/src/types/insights.ts` | API response shapes used on both sides |
| `src/types/news.types.ts` | `packages/shared/src/types/news.types.ts` | News data shapes used on both sides |
| `src/constants/news-sources.ts` | `packages/shared/src/constants/news-sources.ts` | Used by both news display + credibility service |
| `src/constants/sentiment-keywords.ts` | `packages/shared/src/constants/sentiment-keywords.ts` | Used by sentiment analysis + frontend display |
| `src/lib/calculations/decimal-utils.ts` | `packages/shared/src/calculations/decimal-utils.ts` | Used by backend services + frontend P&L display |
| `src/lib/calculations/calculation-service.ts` | `packages/shared/src/calculations/calculation-service.ts` | Shared calculation logic |
| `src/lib/utils/validation.ts` | `packages/shared/src/validation/validation.ts` | Form validation rules shared between client + server |

**Steps**:
1. Move files to `packages/shared/src/`.
2. Create barrel export `packages/shared/src/index.ts`.
3. Update imports across the codebase: `@/types/errors` → `@stock-system/shared/types/errors`.
4. Verify `npm run type-check` passes.

### Phase 2: Move Frontend Code

**Goal**: Relocate pure frontend code to `apps/frontend/`.

| Current Location | Target Location |
|---|---|
| `src/app/` | `apps/frontend/src/app/` |
| `src/components/` | `apps/frontend/src/components/` |
| `src/hooks/` | `apps/frontend/src/hooks/` |
| `src/layouts/` | `apps/frontend/src/layouts/` |
| `src/routes.tsx` | `apps/frontend/src/routes.tsx` |
| `src/main.tsx` | `apps/frontend/src/main.tsx` |
| `src/App.tsx` | `apps/frontend/src/App.tsx` |
| `src/lib/utils/toast.ts` | `apps/frontend/src/lib/utils/toast.ts` |
| `src/lib/utils/date-filters.ts` | `apps/frontend/src/lib/utils/date-filters.ts` |
| `vite.config.ts` | `apps/frontend/vite.config.ts` |
| `index.html` | `apps/frontend/index.html` |
| `postcss.config.js` | `apps/frontend/postcss.config.js` |
| `tailwind.config.ts` | `apps/frontend/tailwind.config.ts` |

**Steps**:
1. Move all frontend files.
2. Update `vite.config.ts` path aliases: `@/` → `./src/`, `@stock-system/shared` → `../../packages/shared/src`.
3. Update all `@/` imports within frontend to resolve correctly.
4. Verify `npm run dev --workspace=apps/frontend` starts and renders.

### Phase 3: Move Backend Code

**Goal**: Relocate services, API handlers, and backend utilities to `apps/backend/`.

| Current Location | Target Location | Transformation |
|---|---|---|
| `src/services/*.service.ts` | `apps/backend/src/services/` | Update imports only |
| `src/lib/api/` | `apps/backend/src/lib/api/` | No changes needed |
| `src/lib/csv/` | `apps/backend/src/lib/csv/` | No changes needed |
| `src/lib/db/` | `apps/backend/src/lib/db/` | No changes needed |
| `src/lib/news-category-mapper.ts` | `apps/backend/src/lib/news-category-mapper.ts` | No changes needed |
| `backend/next-api-legacy/lib/middleware.ts` | `apps/backend/src/middleware/auth.middleware.ts` | Replace `NextRequest` → Express `Request` |
| `backend/next-api-legacy/lib/error-handler.ts` | `apps/backend/src/middleware/error-handler.ts` | Replace `NextResponse` → Express `Response` |
| `backend/next-api-legacy/*/handler.ts` | `apps/backend/src/controllers/*.controller.ts` | Replace Next.js handler → Express controller |

**Key Transformation: Handler → Controller Pattern**

```typescript
// BEFORE (backend/next-api-legacy/portfolios/handler.ts)
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const portfolios = await portfolioService.getPortfolios(user.id)
  return NextResponse.json({ portfolios })
}

// AFTER (apps/backend/src/controllers/portfolios.controller.ts)
import { Request, Response } from 'express'
export async function getPortfolios(req: Request, res: Response) {
  const user = req.user  // attached by auth middleware
  const portfolios = await portfolioService.getPortfolios(user.id)
  res.json({ portfolios })
}
```

**Steps**:
1. Create `apps/backend/src/server.ts` with Express app skeleton + CORS + JSON body parser.
2. Move all 26 service files to `apps/backend/src/services/`.
3. Create route files that register Express routes pointing to controllers.
4. Transform each of the 57 legacy handlers into Express controllers (domain-by-domain).
5. Transform middleware from `NextRequest`/`NextResponse` to Express `req`/`res`/`next`.
6. Move tests: `tests/unit/` → `apps/backend/tests/unit/`, etc.
7. Verify `npm run test --workspace=apps/backend` passes.

### Phase 4: Cleanup

**Goal**: Remove migration artifacts and legacy code.

1. Delete `backend/next-api-legacy/` (all code has been transformed into `apps/backend/`).
2. Delete `backend/api-inventory.json` (replaced by route registrations).
3. Delete now-empty `src/services/`, `src/types/`, `src/constants/`, `src/lib/`.
4. Remove `src/` directory entirely (all code is now in `apps/` or `packages/`).
5. Update root `tsconfig.json` references to point to workspace tsconfigs.
6. Update CI/CD workflows for workspace-aware builds.
7. Update `vercel.json` for frontend SPA deployment.
8. Update constitution.md Technology Stack section (Next.js → Vite + Express).

---

## 4. Ownership Boundaries

### Frontend-Only (`apps/frontend/`)

Code that runs **exclusively in the browser**. No Node.js APIs, no database access, no `process.env`.

| Module | Contents | Import Restrictions |
|---|---|---|
| `src/app/` | Page components (12 routes) | May import from `@stock-system/shared`, `src/components/`, `src/hooks/` |
| `src/components/` | UI + domain components | May import from `@stock-system/shared`, `src/hooks/` |
| `src/hooks/` | React hooks (`useFormValidation`, `useLoading`) | May import from `@stock-system/shared` |
| `src/layouts/` | `RootLayout.tsx` | May import from `src/components/ui/` |
| `src/lib/utils/` | `toast.ts`, `date-filters.ts` | Frontend-only; no shared package dependency |

**Rule**: Frontend code MUST NOT import from `@prisma/client`, `bcrypt`, `papaparse` (server-side CSV), or any `apps/backend/` path.

### Backend-Only (`apps/backend/`)

Code that runs **exclusively on the server**. Has database access, external API keys, file system access.

| Module | Contents | Import Restrictions |
|---|---|---|
| `src/services/` | 26 business logic services | May import from `@stock-system/shared`, `src/lib/` |
| `src/controllers/` | 12 controller files (57 endpoints) | May import from `src/services/`, `@stock-system/shared` |
| `src/routes/` | Express route registrations | May import from `src/controllers/`, `src/middleware/` |
| `src/middleware/` | Auth, error handling, CORS | May import from `src/services/auth.service`, `@stock-system/shared/types/errors` |
| `src/lib/api/` | Finnhub client, Alpha Vantage client, rate limiter | Backend-only; holds API keys |
| `src/lib/csv/` | CSV parser (papaparse) | Backend-only |
| `src/lib/db/` | Prisma client singleton | Backend-only; NEVER expose to frontend |

**Rule**: Backend code MUST NOT import from `react`, `react-dom`, `react-router-dom`, or any `apps/frontend/` path.

### Shared (`packages/shared/`)

Code that is **environment-agnostic** — runs identically in browser and Node.js. No DOM APIs, no Node.js APIs.

| Module | Contents | Constraints |
|---|---|---|
| `src/types/` | `errors.ts`, `insights.ts`, `news.types.ts`, `api.types.ts` | Type-only exports preferred; no runtime deps on platform APIs |
| `src/constants/` | `news-sources.ts`, `sentiment-keywords.ts` | Pure data; no imports |
| `src/calculations/` | `decimal-utils.ts`, `calculation-service.ts` | Depends only on `decimal.js`; no I/O |
| `src/validation/` | `validation.ts` | Pure functions; no I/O |

**Rule**: Shared package MUST NOT import from `@prisma/client`, `react`, `express`, `fs`, `path`, or any platform-specific API. Only `decimal.js` is allowed as a runtime dependency.

### Boundary Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│                    packages/shared                           │
│         types  │  constants  │  calculations  │  validation  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (imported by both)
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│  apps/frontend   │     │    apps/backend       │
│                  │     │                       │
│  components/     │     │  controllers/         │
│  hooks/          │ ──► │  services/            │
│  pages/          │ API │  middleware/           │
│  layouts/        │     │  lib/ (db, api, csv)  │
│                  │     │                       │
│  ❌ No Prisma    │     │  ❌ No React          │
│  ❌ No bcrypt    │     │  ❌ No DOM APIs       │
│  ❌ No fs/path   │     │  ❌ No Vite imports   │
└──────────────────┘     └──────────────────────┘
        │                         │
        ▼                         ▼
   Static SPA              Express API
   (Vercel/CDN)        (Railway/Render/VPS)
```

Frontend communicates with backend **exclusively via HTTP API** (axios calls to `VITE_API_BASE_URL`). There is no shared runtime — only shared types and pure functions at compile time.

---

## Appendix: File Count Summary

| Boundary | Current File Count | Notes |
|---|---|---|
| Frontend-only | ~70 files | Pages (12), components (~40), hooks (2), layouts (1), lib/utils (3), routes, main, App |
| Backend-only | ~85 files | Services (26), legacy handlers (57), lib utilities (6), middleware (2) |
| Shared | ~8 files | Types (3), constants (2), calculations (2), validation (1) |
| Infrastructure | ~15 files | Prisma schema, scripts (4), configs, CI |
