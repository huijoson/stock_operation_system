# Migration Blueprint: Next.js Monolith → Vite SPA + Node.js Backend

**Branch**: `001-vite-migration` | **Date**: 2025-07-18 | **Status**: Approved  
**Scope**: Split hybrid Next.js/Vite monolith into standalone Vite React SPA + Node.js API server

---

## 1. Repository Structure Strategy

### Decision: Monorepo with npm Workspaces

A monorepo is chosen over multi-repo because: (a) shared types (`src/types/errors.ts`, `insights.ts`, `news.types.ts`) and calculation utilities (`src/lib/calculations/`) are used by both frontend and backend; (b) single-developer workflow benefits from atomic cross-package commits; (c) Prisma schema stays as single source of truth at root.

### Target Directory Layout

```
stock_operation_system/                # Monorepo root
├── package.json                       # Workspace root: { "workspaces": ["apps/*", "packages/*"] }
├── tsconfig.base.json                 # Shared TS compiler options
├── prisma/                            # Database schema (shared, unchanged)
│   ├── schema.prisma
│   └── migrations/
│
├── apps/
│   ├── frontend/                      # Vite React SPA
│   │   ├── package.json               # react, react-dom, react-router-dom, recharts, axios, tailwindcss
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx               # Entry: BrowserRouter + RouterProvider
│   │       ├── routes.tsx             # 12 routes + catch-all 404
│   │       ├── app/                   # Page components (from current src/app/)
│   │       ├── components/            # UI + domain components
│   │       ├── hooks/                 # React hooks
│   │       ├── layouts/               # RootLayout with <Outlet />
│   │       ├── services/              # API client wrappers (axios, NO Prisma)
│   │       └── lib/utils/             # Frontend-only utilities (toast, date-filters)
│   │
│   └── backend/                       # Node.js API server
│       ├── package.json               # hono, @hono/node-server, @hono/zod-validator, zod, @prisma/client, bcrypt, decimal.js
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts               # Hono app entry point
│           ├── routes/                # Domain route files (auth, portfolios, transactions, etc.)
│           ├── middleware/            # auth, cors, error-handler, validation
│           ├── validators/            # Zod schemas per domain
│           ├── services/              # 26 business logic services (from src/services/)
│           └── lib/                   # DB (prisma), external API clients, CSV parsing
│
├── packages/
│   └── shared/                        # @stock-system/shared — environment-agnostic code
│       ├── package.json               # Peer dep: decimal.js
│       └── src/
│           ├── types/                 # errors.ts, insights.ts, news.types.ts, api.types.ts
│           ├── constants/             # news-sources.ts, sentiment-keywords.ts
│           ├── calculations/          # decimal-utils.ts, calculation-service.ts
│           └── validation/            # validation.ts
│
├── scripts/                           # Operational scripts (unchanged)
├── docs/                              # Documentation
└── specs/                             # Feature specs
```

### Workspace Configuration (root `package.json`)

```json
{
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=apps/frontend",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:all": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "db:migrate": "prisma migrate dev"
  }
}
```

### Ownership Boundaries

| Boundary | May Import | Must NOT Import |
|---|---|---|
| **`apps/frontend`** | `@stock-system/shared`, own `src/` | `@prisma/client`, `bcrypt`, `fs`, `path`, any `apps/backend/` path |
| **`apps/backend`** | `@stock-system/shared`, own `src/` | `react`, `react-dom`, `react-router-dom`, any `apps/frontend/` path |
| **`packages/shared`** | `decimal.js` only | `@prisma/client`, `react`, `express`, `hono`, any platform-specific API |

---

## 2. Dependency Mapping

### Frontend (`apps/frontend/package.json`)

| Category | Packages |
|---|---|
| Core | `react`, `react-dom`, `react-router-dom` (v7) |
| Build | `vite` (v6), `@vitejs/plugin-react`, `typescript` |
| UI | `tailwindcss`, `postcss`, `autoprefixer` |
| Data | `axios`, `recharts` |
| Shared | `@stock-system/shared` (workspace dependency) |

### Backend (`apps/backend/package.json`)

| Category | Packages |
|---|---|
| Framework | `hono`, `@hono/node-server` |
| Validation | `zod`, `@hono/zod-validator` |
| Database | `@prisma/client`, `prisma` |
| Auth/Crypto | `bcrypt` |
| Financial | `decimal.js` |
| External API | `axios` (Finnhub, Alpha Vantage) |
| Utilities | `papaparse` (CSV), `cookie` |
| Shared | `@stock-system/shared` (workspace dependency) |

### Shared (`packages/shared/package.json`)

| Category | Packages |
|---|---|
| Runtime | `decimal.js` (peer dependency) |
| Types only | Zero runtime dependencies for type exports |

### Files to Extract to `packages/shared/`

| Current Location | Target | Reason |
|---|---|---|
| `src/types/errors.ts` | `packages/shared/src/types/` | Frontend error display + backend error handler |
| `src/types/insights.ts` | `packages/shared/src/types/` | API response shapes on both sides |
| `src/types/news.types.ts` | `packages/shared/src/types/` | News data shapes on both sides |
| `src/constants/news-sources.ts` | `packages/shared/src/constants/` | News display + credibility service |
| `src/constants/sentiment-keywords.ts` | `packages/shared/src/constants/` | Sentiment analysis + display |
| `src/lib/calculations/decimal-utils.ts` | `packages/shared/src/calculations/` | Backend services + frontend P&L display |
| `src/lib/calculations/calculation-service.ts` | `packages/shared/src/calculations/` | Shared calculation logic |
| `src/lib/utils/validation.ts` | `packages/shared/src/validation/` | Form validation on client + server |

---

## 3. API & Data-Flow Strategy

### 3.1 Framework: Hono (over Express)

**Decision**: Use Hono as the backend HTTP framework.

| Rationale | Detail |
|---|---|
| Web Standards alignment | Legacy handlers use `NextRequest`/`NextResponse` (Web API wrappers). Hono uses the same `Request`/`Response` Web API — more natural migration than Express's proprietary objects. |
| Built-in cookie helpers | `getCookie`/`setCookie` directly replace Next.js cookie API. Express requires `cookie-parser`. |
| First-class TypeScript | Typed context (`c.set`/`c.get`), typed routes, generics — no `@types/` package needed. |
| Zod validation built-in | `@hono/zod-validator` replaces inline `if (!field)` checks incrementally. |
| Performance | Near-native speed, 14KB bundle, zero dependencies. |

### 3.2 Route Transformation (43 Endpoints)

All 43 endpoints migrate from `NextRequest`/`NextResponse` to Hono handlers. The services layer (`src/services/`) is **already framework-agnostic** — only the HTTP wrapper changes.

**Transformation pattern**:

```typescript
// BEFORE (Next.js)
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  return NextResponse.json({ data })
}

// AFTER (Hono)
import { Hono } from 'hono'
app.get('/', async (c) => {
  const symbol = c.req.query('symbol')
  return c.json({ data: { ... } })
})
```

**Endpoint inventory (43 routes across 14 domains)**:

| Domain | Endpoints | Auth | Methods |
|---|---|---|---|
| auth | 4 | Mixed | POST, GET |
| portfolios | 4 | Yes | GET, POST, PUT, DELETE |
| transactions | 4 | Yes | GET, POST, PUT, DELETE |
| holdings | 1 | Yes | GET (export) |
| stocks | 3 | No | GET |
| indicators | 10 | No | GET, POST |
| news | 4 | Mixed | GET |
| risk-assessment | 3 | No | GET, POST |
| holding-advice | 2 | No | GET |
| realized-pl | 2 | Yes | GET |
| strategies | 3 | Yes | GET, POST, PUT, DELETE |
| dashboard | 1 | No | GET |
| sync | 1 | Protected | POST |
| query-tsm | 1 | No | GET |

### 3.3 API Versioning & Error Format

**URL-prefix versioning**: All routes under `/api/v1/`.

**Standardized response envelope**:

```typescript
// Success
{ "data": { ... }, "meta": { "timestamp": "...", "page": 1 } }

// Error
{ "error": { "code": "INVALID_INPUT", "message": "投資組合名稱不可為空白", "details": { ... } } }
```

**HTTP status codes**: 200 (success), 201 (created), 204 (deleted), 400 (validation), 401 (unauthorized), 404 (not found), 409 (conflict), 422 (business logic), 500 (server error), 503 (external API down).

### 3.4 CORS Strategy

```
┌──────────────┐   HTTP/CORS   ┌──────────────┐
│ Vite SPA     │ ────────────► │ Hono API     │
│ (:3000)      │               │ (:4000)      │
└──────────────┘               └──────┬───────┘
                                      │
                                ┌─────┴──────┐
                                │ PostgreSQL  │
                                └────────────┘
```

**CORS middleware configuration**:

```typescript
app.use('/api/*', cors({
  origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,          // MANDATORY for cookie auth
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))
```

**Development**: Both CORS-enabled development (catches issues early) and Vite proxy (`/api → :4000`) are supported. Recommend CORS for parity with production.

**Production**: Same-origin reverse proxy (nginx/Caddy) preferred. Cross-origin with explicit CORS as fallback.

### 3.5 Authentication Strategy: Cookie-Based Sessions (Unchanged)

**Decision**: Keep existing cookie-based sessions. Do NOT switch to JWT.

- Session model in Prisma with server-side storage already works
- Cookie sessions more secure for browser SPAs (httpOnly, no localStorage)
- `AuthService.validateSession()` already handles lookup + expiry

**Cookie configuration fix** (currently `secure: false` is hardcoded):

```typescript
setCookie(c, 'session_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // Fix hardcoded false
  sameSite: 'Lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60,  // 30 days
  domain: process.env.COOKIE_DOMAIN,
})
```

### 3.6 Frontend API Client

All 50+ `fetch('/api/...')` calls with relative paths must be updated to use a centralized axios client:

```typescript
// apps/frontend/src/services/api-client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,  // Sends cookies cross-origin
})
```

### 3.7 Data-Flow (Request Lifecycle)

```
Browser → HTTP (cookie: session_token)
  → Hono Global Middleware (CORS, logger, error handler)
    → Route Middleware (auth → Zod validator)
      → Route Handler (thin controller, type conversions)
        → Service Layer (framework-agnostic, Decimal.js math, Prisma queries)
          → PostgreSQL (14 models)
        ← Domain object
      ← c.json({ data: ... }) with CORS headers
    ← HTTP response
  ← Axios interceptor → React state update
```

---

## 4. Routing & Rendering Conversion

### 4.1 Current State

The migration from Next.js file-system routing to `react-router-dom` `RouteObject[]` is **already complete** in `src/routes.tsx`. The app has **never used SSR** — all pages fetch data client-side via `useEffect` + `fetch()`.

### 4.2 Route Map (Next.js → React Router)

| Next.js File Path | SPA Route | Component | Type |
|---|---|---|---|
| `src/app/page.tsx` | `/` | `HomePage` | Static / Public |
| `src/app/(auth)/login/page.tsx` | `/login` | `LoginPage` | Static / Public |
| `src/app/(auth)/register/page.tsx` | `/register` | `RegisterPage` | Static / Public |
| `src/app/dashboard/page.tsx` | `/dashboard` | `DashboardPage` | Protected |
| `src/app/portfolios/page.tsx` | `/portfolios` | `PortfolioListPage` | Protected |
| `src/app/portfolios/[id]/page.tsx` | `/portfolios/:id` | `PortfolioDetailPage` | Protected |
| `src/app/portfolios/[id]/holdings/[symbol]/page.tsx` | `/portfolios/:id/holdings/:symbol` | `HoldingDetailPage` | Protected |
| `src/app/transactions/[portfolioId]/page.tsx` | `/transactions/:portfolioId` | `TransactionListPage` | Protected |
| `src/app/technical-analysis/page.tsx` | `/technical-analysis` | `TechnicalAnalysisPage` | Unguarded |
| `src/app/strategy-builder/page.tsx` | `/strategy-builder` | `StrategyBuilderPage` | Unguarded |
| `src/app/fibonacci-tool/page.tsx` | `/fibonacci-tool` | `FibonacciToolPage` | Unguarded |
| `src/app/backtest-results/[id]/page.tsx` | `/backtest-results/:id` | `BacktestResultsPage` | Unguarded |
| *(new)* | `*` | `NotFoundPage` | Catch-all 404 |

### 4.3 Next.js Constructs Removed/Replaced

| Next.js Construct | Replacement |
|---|---|
| `layout.tsx` (RootLayout with `children`) | `RootLayout` using `<Outlet />` from react-router-dom |
| `(auth)/layout.tsx` (route group) | Flattened — `/login`, `/register` are direct children |
| `loading.tsx` (Suspense boundary) | Per-page `useState(loading)` + `<Loading />` (already in place) |
| `[id]`, `[symbol]`, `[portfolioId]` folders | `:id`, `:symbol`, `:portfolioId` route params |
| `error.tsx` / `not-found.tsx` | `<ErrorBoundary>` wrapper + catch-all `*` route |
| `'use client'` | Remove entirely — pure SPA, no server components |
| `generateMetadata` | `useDocumentTitle` custom hook (client-side) |

### 4.4 SSR → CSR: No Conversion Needed

The project **never used SSR**. Zero `getServerSideProps`, `getStaticProps`, `generateStaticParams`, or React Server Components exist. All pages already do client-side fetching:

```tsx
// Existing pattern (unchanged)
const [loading, setLoading] = useState(true)
useEffect(() => { fetchData().finally(() => setLoading(false)) }, [])
if (loading) return <Loading fullScreen text="載入中..." />
```

### 4.5 Remaining Frontend Cleanup

| Task | Files | Action |
|---|---|---|
| Remove `'use client'` directives | 7 example/README files | Delete the directive line |
| Fix `process.env` in client code | `src/components/ui/ErrorBoundary.tsx` | Replace with `import.meta.env.DEV` |
| Add 404 catch-all route | `src/routes.tsx` | Add `{ path: '*', element: <NotFoundPage /> }` |
| Add `errorElement` to root route | `src/routes.tsx` | Add `errorElement: <RouteErrorPage />` |
| Add client-side page titles | 12 page components | Add `useDocumentTitle()` hook |
| Centralize auth guard | Protected routes | Create `<AuthGuard>` wrapper component |
| Code-splitting | Heavy page components | `React.lazy()` + `<Suspense>` in RootLayout |

---

## 5. Phased Roadmap

### Phase 1: Backend Infrastructure 🏗️ (2–3 days)

**Goal**: Running Hono server with Prisma, auth middleware, health check — zero business logic.

| # | Task | Deliverable |
|---|---|---|
| 1.1 | Create `apps/backend/package.json` with Hono, Prisma, Zod deps | Package config |
| 1.2 | Create `apps/backend/tsconfig.json` extending root base config | TS config |
| 1.3 | Create Hono app entry with CORS, JSON body parser, cookie handling | `src/index.ts` |
| 1.4 | Copy + configure Prisma client singleton | `src/lib/prisma.ts` |
| 1.5 | Convert auth middleware from `NextRequest` → Hono context | `src/middleware/auth.ts` |
| 1.6 | Create centralized error handler middleware | `src/middleware/error-handler.ts` |
| 1.7 | Create health check route: `GET /api/v1/health` | `src/routes/health.ts` |
| 1.8 | Configure Vite dev server proxy: `/api → :4000` | `vite.config.ts` |
| 1.9 | Add backend scripts to root `package.json` | `backend:dev`, `backend:build` |

**Exit criteria**:
- `npm run backend:dev` starts Hono on port 4000
- `curl http://localhost:4000/api/v1/health` returns `{ "status": "ok" }`
- Prisma connects to PostgreSQL from backend process
- Auth middleware validates session cookies
- `tsc --noEmit` passes for both frontend and backend

**Rollback**: Delete `apps/backend/src/`, revert `vite.config.ts` proxy.

---

### Phase 2: API Route Extraction 🔄 (4–6 days)

**Goal**: All 43 API handlers converted from `NextRequest`/`NextResponse` to Hono routes.

| # | Domain | Handlers | Priority Rationale |
|---|---|---|---|
| 2.1 | Route registration scaffold | 1 file | Foundation for all routes |
| 2.2 | **auth** (login, logout, register, me) | 4 | Foundation — validates full auth flow |
| 2.3 | **portfolios** (CRUD + holdings + transactions) | 4 | Core data, validates auth end-to-end |
| 2.4 | **transactions** (CRUD + import/export) | 4 | Depends on auth + portfolio |
| 2.5 | **stocks** (search, price, history) | 3 | No auth, validates public route pattern |
| 2.6 | **indicators** (10 endpoints) | 10 | Largest domain, validates query param handling |
| 2.7 | **strategies** (CRUD + backtest) | 3 | Auth + complex JSON body |
| 2.8 | **news** (by symbol, sources, sentiment, portfolio) | 4 | Tests external API integration |
| 2.9 | **risk-assessment** (by symbol, batch, portfolio) | 3 | Depends on indicators + news |
| 2.10 | **realized-pl** + **holdings** + **holding-advice** | 5 | Financial calculations |
| 2.11 | **dashboard** + **sync** + **query-tsm** + **cache** | 4 | Utility endpoints |
| 2.12 | Migrate 12 API test files to supertest | 12 test files | Verify parity |

Tasks 2.2–2.11 are **independent** and can be parallelized across developers.

**Exit criteria**:
- Zero `next/server` imports in `apps/backend/src/`
- All 43 endpoints respond correctly via curl/supertest
- All 12 migrated API tests pass
- `backend/next-api-legacy/` marked deprecated (not yet deleted)

**Rollback**: Each domain router is independently registered. Comment out a single domain's registration to roll back.

---

### Phase 3: Frontend Purification 🎨 (3–4 days)

**Goal**: Frontend is a pure SPA with zero server-side code. All data fetching goes through the API.

| # | Task | Files |
|---|---|---|
| 3.1 | Remove `'use client'` from 7 example/README files | 7 files |
| 3.2 | Move 16 Prisma-dependent services from `src/services/` → `apps/backend/src/services/` | 16 files |
| 3.3 | Create frontend API client layer (`axios` wrapper with `VITE_API_URL`) | 1 file |
| 3.4 | Create frontend service wrappers calling API client instead of Prisma | ~10 files |
| 3.5 | Remove `src/lib/db/` (Prisma client) from frontend | 3 files |
| 3.6 | Update all component imports to use new frontend services | ~20 components |
| 3.7 | Fix `process.env.NODE_ENV` → `import.meta.env.DEV` in ErrorBoundary | 1 file |
| 3.8 | Add 404 catch-all route + NotFoundPage component | 2 files |
| 3.9 | Remove `@prisma/client` from frontend dependencies | `package.json` |
| 3.10 | Verify bundle has no Prisma/bcrypt leakage | Build output |

Tasks 3.1 and 3.7–3.8 can start **in parallel with Phase 1**. Tasks 3.2–3.6 require Phase 2 completion.

**Exit criteria**:
- `grep -r "from '@prisma" apps/frontend/src/` → zero results
- `grep -r "'use client'" apps/frontend/src/` → zero results
- `npm run build --workspace=apps/frontend` produces bundle < 500KB
- All pages render correctly with data from API
- `grep -r "process.env" dist/` → zero results (no env leaks)

**Rollback**: Frontend service wrappers are an additive layer. Revert imports and temporarily keep Prisma in root deps.

---

### Phase 4: Integration Testing & Auth Flow 🔗 (2–3 days)

**Goal**: Verify full stack end-to-end — frontend ↔ backend ↔ database — with correct auth, CORS, and error handling.

| # | Task |
|---|---|
| 4.1 | E2E test: login → dashboard → portfolio CRUD → logout (Playwright) |
| 4.2 | Test CORS: allow frontend origin, reject others |
| 4.3 | Test cookie auth: session token set/read/clear across origins |
| 4.4 | Test error propagation: backend errors display as zh-TW user messages |
| 4.5 | Validate concurrent dev workflow: Vite (:3000) + Hono (:4000) |
| 4.6 | Create `docker-compose.yml`: frontend + backend + PostgreSQL |
| 4.7 | Create unified dev script: `npm run dev:full` |
| 4.8 | Verify all API response times < 200ms |
| 4.9 | Test 404 handling: unknown API routes return JSON error, unknown SPA routes show 404 page |

**Exit criteria**:
- E2E test suite passes: login → CRUD → logout
- CORS correctly restricts origins
- Cookie auth works across frontend/backend
- Error messages display in zh-TW
- `docker-compose up` starts full stack

**Rollback**: Integration tests are additive — no production code changes. Fix issues by patching Phase 2 or 3.

---

### Phase 5: Hardening & Release 🚀 (2–3 days)

**Goal**: Production-ready — CI/CD pipeline, deployment config, documentation, cleanup.

| # | Task |
|---|---|
| 5.1 | Create `.github/workflows/ci.yml`: lint + type-check + test (both workspaces) + build |
| 5.2 | Create `.github/workflows/deploy.yml`: build + deploy frontend (static) + deploy backend (Docker) |
| 5.3 | Delete `backend/next-api-legacy/` directory |
| 5.4 | Update `vercel.json` for pure SPA deployment |
| 5.5 | Update `README.md` with new architecture and dev workflow |
| 5.6 | Create `apps/backend/README.md` with API documentation |
| 5.7 | Update constitution Technology Stack: `Next.js 15` → `Vite 6 + Hono` |
| 5.8 | Final bundle size audit: frontend < 500KB, no server code leakage |
| 5.9 | Security audit: no secrets in bundle, auth tokens scoped correctly |
| 5.10 | Verify all success criteria SC-001 through SC-008 from spec |

**Exit criteria**:
- CI pipeline passes all checks
- `backend/next-api-legacy/` deleted — zero Next.js patterns in repo
- README reflects new architecture
- Bundle < 500KB, API < 200ms, dev server < 5s startup
- `grep -r "next/" --include="*.ts" --include="*.tsx" apps/` → zero results

---

### Phase Dependency Graph

```
Phase 1 (Backend Infra) ─────────┬──→ Phase 2 (API Extraction)
                                  │
                                  └──→ Phase 3 (Frontend Purification)
                                            │  ↑
                          Tasks 3.1, 3.7-3.8 can start with Phase 1
                          Tasks 3.2-3.6 need Phase 2 done
                                            │
Phase 2 + Phase 3 (both done) ───→ Phase 4 (Integration Testing)
                                            │
Phase 4 (done) ──────────────────→ Phase 5 (Hardening & Release)
```

**Estimated timeline**: ~15–18 working days (single developer). With parallelization: ~10–12 days.

---

## 6. Risk Assessment

### Severity / Likelihood Matrix

| ID | Risk | Severity | Likelihood | Overall | Mitigation |
|---|---|---|---|---|---|
| **R3** | Auth/session across origins — `sameSite: 'lax'` blocks cookie on cross-origin POST. Login silently fails. | 🔴 Critical | 🔴 Almost Certain | **🔴 Extreme** | Use Vite proxy in dev (eliminates CORS). In production, same-origin reverse proxy OR `sameSite: 'none'` + `secure: true`. Test login flow end-to-end as Phase 4 first task. |
| **R4** | CORS misconfiguration — Zero CORS config exists today. After split, every API call is cross-origin. Browser blocks all responses. | 🔴 Critical | 🔴 Almost Certain | **🔴 Extreme** | Add Hono `cors` middleware in Phase 1. `credentials: true` mandatory. Add `withCredentials: true` to all axios calls. Test with browser DevTools Network tab. |
| **R5** | Env variable leakage — `process.env.ALPHA_VANTAGE_API_KEY` in `src/services/` would expose keys if bundled into frontend. | 🟠 High | 🟡 Possible | **🟠 High** | Split `.env` into frontend (VITE_* only) and backend. Move all Prisma-dependent services to backend in Phase 3. Post-build check: `grep -r "process.env" dist/` must return 0. |
| **R6** | API parity drift — Rewriting 43 handlers introduces subtle behavioral differences (query parsing, body parsing, cookie API). | 🟠 High | 🟡 Possible | **🟠 High** | Create Zod schemas in `packages/shared/` for all endpoint shapes. Add supertest contract tests per domain. Compare old vs new handler responses. |
| **R7** | Test brittleness — Path alias `@/` changes, Jest config duplication, integration tests need separate DB config. | 🟡 Medium | 🟡 Possible | **🟡 Medium** | Maintain `@/` alias in both workspaces. Keep Jest config in sync. Run full test suite after each migration step. |
| **R1** | Bundle bloat — `@prisma/client` or `bcrypt` leak into frontend build via tree-shaking failure. | 🟡 Medium | 🟡 Possible | **🟡 Medium** | Separate `package.json` per workspace. Frontend must NOT list server deps. Use `rollup-plugin-visualizer` in CI. Alert if bundle > 500KB gzipped. |
| **R2** | SEO loss — SPA without SSR. | 🟢 Low | 🟢 Unlikely | **🟢 Low** | No action needed — login-gated private app with zero organic search traffic. Add `noindex, nofollow` to `index.html`. |

### Top 5 Go-Live Blockers

| # | Blocker | Detection Signal | Pre-Launch Check |
|---|---|---|---|
| 1 | **Cross-origin auth failure** (R3+R4) | Login returns 200 but `/api/auth/me` returns 401. `Set-Cookie` present but `Cookie` missing on next request. | CORS middleware with `credentials: true` ✓ All `fetch`/`axios` with `credentials: 'include'` ✓ Login → session → me → CRUD → logout tested ✓ |
| 2 | **API endpoints broken** (R6) | Frontend shows empty data or errors on any page. | Smoke test all 43 endpoints ✓ Auth-protected routes return 401 without cookie ✓ Request body parsing works for POST/PUT ✓ |
| 3 | **Frontend API base URL missing** (R4) | 50+ hardcoded `/api/...` calls 404 against Vite dev server. | `VITE_API_URL` env var configured ✓ All fetch calls use centralized client OR Vite proxy configured ✓ |
| 4 | **Server deps in frontend bundle** (R1+R5) | `vite build` fails or bundle > 1MB. | Frontend `package.json` has no `@prisma/client`, `bcrypt`, `pg` ✓ `grep -r "prisma" dist/` returns 0 ✓ `grep -r "process.env" dist/` returns 0 ✓ |
| 5 | **Tests failing** (R7) | CI red after file moves. | `npm test` passes in both workspaces ✓ Path alias `@/` resolves in Jest ✓ Integration tests connect to correct DB ✓ |

### Per-Phase Risk Mitigations

| Phase | Key Risk | Mitigation |
|---|---|---|
| 1 | Prisma connection from new backend | Health check with DB ping as first test |
| 2 | Business logic regression during handler rewrite | Keep legacy handlers as reference; diff responses between old and new |
| 3 | Missing API client calls (broken components) | TypeScript strict mode catches missing service calls at compile time |
| 4 | Cross-origin CORS/cookie issues | Dev proxy eliminates CORS issues; test with real CORS for production parity |
| 5 | CI environment differences | Docker-based CI matches local docker-compose |

### Post-Migration Monitoring (First 72 Hours)

| Hour | Action |
|---|---|
| 0–1 | Deploy backend, run full 43-endpoint smoke test. Monitor CORS errors. Verify login flow. |
| 1–4 | Monitor auth failure rate. Compare API response times to pre-migration baseline. Check DB connections. |
| 4–24 | Watch for session expiry issues, memory leaks from Prisma instances, intermittent 5xx. |
| 24–72 | Validate cron job replacement (`/api/sync/dashboard-news` — currently Vercel Cron, needs `node-cron`). Check for stale data. |

**Key metrics to monitor**: API response time (p95 < 2s), 5xx error rate (< 1%), auth failure rate (< 10%), frontend JS errors (< 5/min), bundle size trend, DB connection count (< 20 idle).

---

## Appendix A: API Contract Guarantee

All 43 endpoints maintain:
1. **Same paths** — frontend axios calls unchanged (only base URL differs)
2. **Same request/response JSON shapes** — no schema changes
3. **Same authentication mechanism** — cookie-based `session_token`
4. **Same HTTP status codes** — identical success/error codes

The handler signature change (`NextRequest`/`NextResponse` → Hono `Context`) is transparent to the HTTP layer.

## Appendix B: Files Staying Unchanged

- Prisma schema and migrations (zero DB changes)
- Form validation logic (`useFormValidation` hook)
- All React components (visual/behavioral — only import paths change)
- Tailwind CSS configuration
- Financial calculation logic (Decimal.js, FIFO, P&L)

## Appendix C: Source Artifacts

This blueprint consolidates decisions from:
- `specs/001-vite-migration/plan.md` — Phased execution roadmap
- `specs/001-vite-migration/research.md` — Technical research (7 topics resolved)
- `specs/001-vite-migration/data-model.md` — Entity mapping, API endpoint inventory
- `specs/001-vite-migration/contracts/api-contracts.md` — API contract specifications
- `specs/001-vite-migration/quickstart.md` — Developer quickstart guide
- `specs/001-vite-migration/architecture-blueprint.md` — Monorepo structure, ownership boundaries
- `specs/001-vite-migration/routing-migration-plan.md` — Route mapping, SSR→CSR guidance
- `specs/001-vite-migration/risk-assessment.md` — Risk analysis, go-live blockers, monitoring
- `docs/api-migration-plan.md` — Hono framework recommendation, CORS/auth strategy, data-flow diagrams
