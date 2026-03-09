# Migration Risk Assessment: Monolith → Vite Frontend + Node Backend

**Feature Branch**: `001-vite-migration`  
**Date**: 2025-07-18  
**Status**: Complete  
**Scope**: Split current hybrid Next.js/Vite monolith into standalone Vite SPA frontend + Node.js (Express/Fastify) backend

---

## 1. Technical Risks

### R1 — Performance: First-Load Shift (Client-Side Rendering)

| Attribute | Detail |
|-----------|--------|
| **Current state** | Already a pure SPA — zero SSR (`getServerSideProps`, `generateMetadata`, server components NOT used). Entry point: `index.html` → `src/main.tsx` with `BrowserRouter`. |
| **Codebase evidence** | No `from 'next/` imports in `src/` (0 matches). `'use client'` only in 7 example/README files, not app code. Vite already configured (`vite.config.ts` with `@vitejs/plugin-react`). |
| **Risk** | Bundle grows if Prisma client or bcrypt leak into the frontend build. `@prisma/client` (^6.19.0) and `bcrypt` (^6.0.0) are in the single `package.json` today — tree-shaking may not exclude them from the Vite bundle. |
| **Impact** | Increased JS payload → slower TTI on mobile / slow networks. |
| **Detection** | `vite build --report` or `rollup-plugin-visualizer` — check for `@prisma/client`, `bcrypt`, `decimal.js` in frontend chunks. |

### R2 — SEO Loss from SSR Removal

| Attribute | Detail |
|-----------|--------|
| **Current state** | No SSR exists. The app is a login-gated investment dashboard — zero public-facing crawlable content. |
| **Codebase evidence** | All pages behind `/api/auth/me` check (`src/app/dashboard/page.tsx:50`). No `<meta>` generation on server. |
| **Risk** | **Negligible.** No organic search traffic is expected for a private portfolio tool. |
| **Mitigation** | If SEO is ever needed, add `prerender-spa-plugin` or Vite SSG for landing page only. |

### R3 — Auth & Session Integrity Across Origins

| Attribute | Detail |
|-----------|--------|
| **Current state** | Cookie-based sessions: `session_token` httpOnly cookie, `sameSite: 'lax'`, `secure: false` (hardcoded). 30-day expiry. DB-backed via Prisma Session model. |
| **Codebase evidence** | `backend/next-api-legacy/auth/login/handler.ts:40-48` — cookie set with `sameSite: 'lax'`. `backend/next-api-legacy/lib/middleware.ts:9` reads `request.cookies.get('session_token')`. |
| **Risk** | **HIGH.** When frontend and backend are on different origins (e.g., `localhost:3000` vs `localhost:4000`), `sameSite: 'lax'` blocks cookie transmission on cross-origin POST requests. Login will silently fail. Even in production, if domains diverge (`app.example.com` → `api.example.com`), cookies won't attach unless `sameSite` and `domain` are reconfigured. |
| **Impact** | Complete auth failure — users cannot log in or stay authenticated. |
| **Detection** | Manual test: open frontend on port 3000, backend on port 4000, attempt login. Check `Set-Cookie` and `Cookie` headers in DevTools Network tab. |

### R4 — CORS Misconfiguration

| Attribute | Detail |
|-----------|--------|
| **Current state** | **Zero CORS configuration exists.** No `Access-Control-*` headers in any handler (grep: 0 matches across `backend/`). The monolith serves both frontend and API from the same origin, so CORS is not needed today. |
| **Codebase evidence** | 50+ `fetch('/api/...')` calls in `src/` use **relative paths** (e.g., `src/app/dashboard/page.tsx:50`, `src/app/technical-analysis/page.tsx:68`). No base URL abstraction. |
| **Risk** | **HIGH.** After split, every API call will be cross-origin. Without CORS middleware: (a) preflight OPTIONS requests will 404, (b) browsers will block all responses, (c) credentials (cookies) won't be sent unless `credentials: 'include'` is added to every `fetch()` call AND the backend sets `Access-Control-Allow-Credentials: true`. |
| **Impact** | Total application failure — no API calls succeed. |
| **Detection** | Browser console: `CORS policy: No 'Access-Control-Allow-Origin'` errors on every API call. |

### R5 — Environment Variable Leakage

| Attribute | Detail |
|-----------|--------|
| **Current state** | `.env` contains server secrets: `FINNHUB_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `DATABASE_URL`, `CRON_SECRET`. Only one `VITE_` prefixed var: `VITE_APP_URL`. Frontend code has zero `import.meta.env` usage (grep: 0 matches in `src/`). |
| **Codebase evidence** | `src/services/dashboard-news-sync.service.ts:80` reads `process.env.ALPHA_VANTAGE_API_KEY`. `src/lib/db/prisma.ts:10` reads `process.env.NODE_ENV`. `src/components/ui/ErrorBoundary.tsx:97` reads `process.env.NODE_ENV`. |
| **Risk** | **MEDIUM.** Services in `src/services/` that read `process.env` directly (e.g., `dashboard-news-sync.service.ts`) would fail or expose keys if accidentally bundled into the Vite frontend. `process.env` is undefined in browser context. Additionally, `.env` with `NODE_TLS_REJECT_UNAUTHORIZED=0` is a security vulnerability if carried to production. |
| **Impact** | API keys exposed in client JS bundle → credential compromise; or services crash with `undefined` env vars. |
| **Detection** | `grep -r "process.env" dist/` after `vite build` — any match = leaked secret. |

### R6 — API Parity Drift

| Attribute | Detail |
|-----------|--------|
| **Current state** | 43 API endpoints documented in `backend/api-inventory.json`. Handlers use Next.js `NextRequest`/`NextResponse` API. Frontend uses hardcoded relative paths (`/api/auth/login`, `/api/portfolios/${id}/holdings`, etc.). |
| **Codebase evidence** | All handlers in `backend/next-api-legacy/` import `from 'next/server'`. No shared contract/schema (e.g., OpenAPI, zod schemas) between frontend fetch calls and backend handlers. |
| **Risk** | **MEDIUM.** During migration, rewriting 43 handlers from `NextRequest`/`NextResponse` to Express/Fastify `req`/`res` patterns introduces subtle behavioral differences: (a) query param parsing changes, (b) `request.json()` vs `req.body` (needs body-parser), (c) cookie API differences (`request.cookies.get()` vs `req.cookies`), (d) response header behavior. Without contract tests, drift goes undetected until users hit bugs. |
| **Impact** | Silent data corruption or incorrect API responses. |
| **Detection** | End-to-end API test suite comparing old vs new handler responses. Contract tests with shared zod schemas. |

### R7 — Test Brittleness

| Attribute | Detail |
|-----------|--------|
| **Current state** | 36+ test files: 16 unit tests, 20+ property-based tests (fast-check), 2 integration tests. |
| **Codebase evidence** | Integration tests (`tests/integration/realized-pl.api.test.ts`) create real DB records via `new PrismaClient()`. Unit tests mock Prisma (`jest.mock('@prisma/client')`). Path alias `@/` used throughout. Services instantiate Prisma inconsistently — some use constructor injection, others `new PrismaClient()` inline. |
| **Risk** | **MEDIUM.** (a) Tests importing from `@/services/` will break if path aliases change during monorepo split. (b) Integration tests that hit real DB will need separate connection config per package. (c) Jest config (`jest.config.js`) resolves `@/` to `src/` — must be duplicated or restructured for split packages. (d) Property-based tests are backend-only (financial math) — low risk if kept in backend package. |
| **Impact** | False CI failures erode confidence during migration. |
| **Detection** | `npm test` after each migration step — any failure is a signal. |

---

## 2. Severity / Likelihood Matrix

| ID | Risk | Severity | Likelihood | Overall | Mitigation | Detection Signal |
|----|------|----------|-----------|---------|------------|------------------|
| **R3** | Auth/session across origins | 🔴 Critical | 🔴 Almost Certain | **🔴 Extreme** | Switch to `sameSite: 'none'` + `secure: true` for cross-origin, OR use same-origin proxy (`vite.config.ts` proxy for dev, nginx for prod). For same-domain deploy, use `sameSite: 'lax'` + shared domain cookie (`domain: '.example.com'`). | Login returns 200 but subsequent `/api/auth/me` returns 401. `Set-Cookie` header present but `Cookie` header missing on next request. |
| **R4** | CORS misconfiguration | 🔴 Critical | 🔴 Almost Certain | **🔴 Extreme** | Add `cors` middleware to Express/Fastify backend: `origin: [VITE_APP_URL]`, `credentials: true`, `methods: ['GET','POST','PUT','DELETE','PATCH']`. Update all `fetch()` calls with `credentials: 'include'`. | Browser console shows `CORS policy` errors. Network tab shows preflight OPTIONS → 404/403. |
| **R5** | Env variable leakage | 🟠 High | 🟡 Possible | **🟠 High** | Split `.env` into `.env.frontend` (VITE_* only) and `.env.backend`. Add build-time check: `grep -r "process.env" dist/` must return 0 results. Move `src/services/` to backend package exclusively. | `process.env.FINNHUB_API_KEY` appears in browser JS source. `undefined` errors in console from `process.env` reads. |
| **R6** | API parity drift | 🟠 High | 🟡 Possible | **🟠 High** | Create shared zod schemas in `packages/shared/` for all 43 endpoint request/response types. Add contract tests that validate both frontend fetch calls and backend handlers against schemas. Implement API versioning (`/api/v1/`). | Frontend receives unexpected response shape. TypeScript errors at API boundaries. Mismatched status codes. |
| **R7** | Test brittleness | 🟡 Medium | 🟡 Possible | **🟡 Medium** | Maintain `@/` path alias in both packages' tsconfig. Keep Jest config in sync. Pin `DATABASE_URL` in test env. Run full test suite in CI on every PR. | `npm test` failures after file moves. `MODULE_NOT_FOUND` errors for `@/services/*`. |
| **R1** | First-load bundle bloat | 🟡 Medium | 🟡 Possible | **🟡 Medium** | Separate `package.json` per package. Frontend must NOT list `@prisma/client`, `bcrypt`, or `pg` as dependencies. Use `rollup-plugin-visualizer` in CI to flag server deps in client bundle. | Bundle size > 500KB gzipped. Prisma/bcrypt strings found in `dist/assets/*.js`. |
| **R2** | SEO loss | 🟢 Low | 🟢 Unlikely | **🟢 Low** | No action needed — login-gated private app. If needed later, add Vite SSG plugin for public landing page only. | Organic search traffic drops (currently zero, so no impact). |

---

## 3. Top 5 Go-Live Blockers & Pre-Launch Checks

### Blocker 1: Cross-Origin Auth Flow (R3 + R4)

**Why it blocks**: Without correct CORS + cookie config, zero API calls succeed — the app is completely non-functional.

**Pre-launch checks**:
- [ ] CORS middleware installed and configured: `origin` whitelist includes production frontend URL, `credentials: true`
- [ ] All `fetch()` calls include `credentials: 'include'` (audit all 50+ call sites in `src/app/` and `src/components/`)
- [ ] `Set-Cookie` response header includes correct `domain`, `sameSite`, `secure` attributes for production
- [ ] Login flow tested end-to-end: login → cookie set → `/api/auth/me` returns 200 with user data → page navigation retains session
- [ ] Logout clears cookie and subsequent API calls return 401
- [ ] Session expiry (30 days) still enforced after migration

### Blocker 2: All 43 API Endpoints Functional (R6)

**Why it blocks**: Any broken endpoint = broken feature for users.

**Pre-launch checks**:
- [ ] Each of the 43 routes from `backend/api-inventory.json` responds correctly on the new backend
- [ ] Smoke test script hits every endpoint with valid auth token and verifies 2xx response
- [ ] Auth-protected routes return 401 without session cookie
- [ ] Request body parsing works for all POST/PUT/PATCH endpoints (body-parser configured)
- [ ] Query parameter handling matches Next.js behavior (e.g., `?symbol=AAPL&period=14`)
- [ ] Error responses maintain same shape: `{ error: string }` with correct HTTP status codes

### Blocker 3: Frontend API Base URL Configurable (R4)

**Why it blocks**: 50+ hardcoded relative fetch paths (`/api/...`) will 404 against the Vite dev server.

**Pre-launch checks**:
- [ ] `VITE_API_BASE_URL` env var created and documented
- [ ] All `fetch('/api/...')` calls updated to `fetch(\`${API_BASE_URL}/api/...\`)`  — OR — Vite dev proxy configured to forward `/api/*` to backend
- [ ] Production build uses correct base URL (not `localhost`)
- [ ] API URL is NOT hardcoded in source — only read from env or proxy config

### Blocker 4: No Server Dependencies in Frontend Bundle (R1 + R5)

**Why it blocks**: Prisma/bcrypt in frontend bundle = build failures or runtime crashes in browser.

**Pre-launch checks**:
- [ ] Frontend `package.json` has separate dependencies — no `@prisma/client`, `bcrypt`, `pg`, `decimal.js` (backend-only)
- [ ] `vite build` completes without errors
- [ ] `grep -r "prisma" dist/assets/` returns 0 matches
- [ ] `grep -r "process.env" dist/assets/` returns 0 matches (no env leaks)
- [ ] Bundle size < 500KB gzipped (verify with `du -sh dist/`)

### Blocker 5: Existing Tests Pass (R7)

**Why it blocks**: Failing tests indicate broken functionality that users will experience.

**Pre-launch checks**:
- [ ] `npm test` passes with 0 failures in both frontend and backend packages
- [ ] Path alias `@/` resolves correctly in Jest for both packages
- [ ] Integration tests connect to correct database
- [ ] Property-based tests (fast-check) for financial calculations still pass (these are critical for correctness of P&L, FIFO, risk scores)
- [ ] No `MODULE_NOT_FOUND` errors from import path changes

---

## 4. Post-Migration Observability Recommendations

### 4.1 Structured Logging

| Layer | Tool | What to Log |
|-------|------|-------------|
| **Backend API** | `pino` or `winston` (JSON format) | Every request: `{ method, path, statusCode, durationMs, userId, correlationId }`. Auth failures: `{ event: 'auth_failure', reason, ip, sessionToken: 'redacted' }`. |
| **Frontend** | `window.onerror` + `fetch` interceptor | Unhandled JS errors, API call failures with status code, chunk load failures (`ChunkLoadError` — already handled by `src/components/ui/ChunkErrorRecovery.tsx`). |
| **Database** | Prisma query logging | Slow queries (> 500ms), connection pool exhaustion, migration failures. Currently enabled in dev via `src/lib/db/prisma.ts:10`. |

### 4.2 Key Metrics

| Metric | Source | Alert Threshold | Why |
|--------|--------|-----------------|-----|
| **API response time (p95)** | Backend middleware | > 2s | Detect performance regressions from handler rewrite |
| **API error rate (5xx)** | Backend logs | > 1% of requests | Catch handler bugs from NextRequest→Express migration |
| **Auth failure rate** | `/api/auth/me` 401 responses | > 10% of auth checks | Detect cookie/session breakage (R3) |
| **Frontend JS errors** | `window.onerror` | > 5 errors/min | Catch missing API base URL, CORS failures, chunk errors |
| **Bundle size** | CI build artifact | > 10% increase from baseline | Detect server-dep leakage into frontend (R1) |
| **API endpoint coverage** | Smoke test suite | < 43 endpoints passing | Detect missed endpoints during migration (R6) |
| **DB connection count** | Prisma / pg_stat_activity | > 20 idle connections | Detect Prisma client instantiation leak (multiple `new PrismaClient()` per request) |
| **Cookie set rate** | Login endpoint logs | Drop > 50% from baseline | Detect `Set-Cookie` header being stripped by CORS (R3) |

### 4.3 Alerts (Priority Order)

1. **🔴 P1 — Auth circuit breaker**: If `/api/auth/me` returns 401 for >50% of requests in a 5-min window → page team. Likely CORS or cookie regression.
2. **🔴 P1 — API availability**: If any of the 43 endpoints returns 5xx for >5 consecutive requests → page team. Likely handler migration bug.
3. **🟠 P2 — Frontend error spike**: If `window.onerror` fires >20 times in 5 min → investigate. Likely chunk load failure or missing API endpoint.
4. **🟡 P3 — Slow queries**: If Prisma query p95 > 1s → investigate. Likely connection pool issue from multiple `new PrismaClient()` (existing tech debt, see `backend/next-api-legacy/` handlers).
5. **🟡 P3 — Bundle size regression**: If CI reports frontend bundle > 600KB gzipped → block deploy. Likely server dependency leaked.

### 4.4 Recommended Dashboard (Grafana / Datadog)

```
┌─────────────────────────────────────────────────┐
│  Migration Health Dashboard                      │
├──────────────────┬──────────────────────────────┤
│ API Response Time │ Auth Success Rate            │
│ (p50/p95/p99)    │ (login + session validation)  │
├──────────────────┼──────────────────────────────┤
│ 5xx Error Rate   │ Frontend JS Error Count       │
│ (by endpoint)    │ (by error type)               │
├──────────────────┼──────────────────────────────┤
│ DB Connections   │ Bundle Size Trend             │
│ (active/idle)    │ (per CI build)                │
├──────────────────┼──────────────────────────────┤
│ CORS Rejections  │ API Endpoint Coverage         │
│ (from access log)│ (smoke test pass/fail)        │
└──────────────────┴──────────────────────────────┘
```

### 4.5 First 72-Hour Monitoring Playbook

| Hour | Action |
|------|--------|
| **0-1** | Deploy backend, run full 43-endpoint smoke test. Monitor CORS errors in browser console. Verify login flow end-to-end. |
| **1-4** | Monitor auth failure rate. Compare API response times against pre-migration baseline. Check DB connection count. |
| **4-24** | Watch for slow-burn issues: session expiry, memory leaks from Prisma instances, intermittent 5xx on high-traffic endpoints (portfolios, indicators). |
| **24-72** | Validate cron job replacement (`/api/sync/dashboard-news` — currently Vercel Cron, needs `node-cron` or equivalent). Check for stale data from missing sync. |

---

## Appendix: Codebase Evidence Summary

| Finding | File(s) | Line(s) |
|---------|---------|---------|
| No SSR patterns in src/ | All `src/app/` pages | — |
| Cookie config: httpOnly, lax, secure=false | `backend/next-api-legacy/auth/login/handler.ts` | 40-48 |
| Auth middleware reads cookie | `backend/next-api-legacy/lib/middleware.ts` | 9, 61 |
| Zero CORS headers | All `backend/` files | 0 matches |
| 50+ relative fetch calls | `src/app/`, `src/components/` | (see R4 evidence) |
| process.env in src/ (4 occurrences) | `src/services/dashboard-news-sync.service.ts`, `src/lib/db/prisma.ts`, `src/components/ui/ErrorBoundary.tsx` | 80, 10, 97 |
| Zero import.meta.env in src/ | All `src/` files | 0 matches |
| Prisma client inconsistency | Services + API handlers | Multiple new PrismaClient() |
| 43 API endpoints | `backend/api-inventory.json` | — |
| 'use client' only in examples | 7 example/README files | — |
| NODE_TLS_REJECT_UNAUTHORIZED=0 | `.env` | Security vulnerability |
| Vercel cron job | `vercel.json` | Needs replacement |
