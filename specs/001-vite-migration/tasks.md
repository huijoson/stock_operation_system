# Tasks: Next.js 至 Vite (React SPA) 遷移

**Input**: Design documents from `/specs/001-vite-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included where plan.md explicitly specifies (API test migration, integration verification). This is a migration/refactoring — TDD adjusted to "ensure existing tests pass + migrate test mocks."

**Organization**: Tasks grouped by user story from spec.md (6 stories: US1–US6) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `src/` at repository root (Vite React SPA)
- **Backend**: `backend/src/` (new Express server)
- **Legacy**: `backend/next-api-legacy/` (source for conversion, deleted at end)
- **Tests**: `tests/` (frontend), `backend/src/__tests__/` (backend API)

---

## Phase 1: Setup (Backend Project Scaffolding)

**Purpose**: Initialize the Express backend project structure — the target for API route extraction.

- [x] T001 Create backend/package.json with Express, cors, cookie-parser, @prisma/client, ts-node, typescript, @types/express, @types/cors, @types/cookie-parser dependencies
- [x] T002 [P] Create backend/tsconfig.json inheriting root config, targeting CommonJS/Node with outDir dist/
- [x] T003 [P] Create backend/src/types/express.d.ts to augment Express Request with user context (id, email)
- [x] T004 Add backend scripts (backend:dev, backend:build, backend:start) to root package.json

---

## Phase 2: Foundational (Backend Core Infrastructure)

**Purpose**: Core Express server infrastructure that MUST be complete before API route extraction (US4)

**⚠️ CRITICAL**: US4 (API route extraction) cannot begin until this phase is complete. US1, US2, US3, US5, US6 have NO dependency on this phase and can proceed in parallel.

- [x] T005 Create Express application entry with CORS, JSON body parser, cookie-parser middleware in backend/src/app.ts
- [x] T006 Create server entry listening on PORT env var (default 3001) in backend/src/server.ts
- [x] T007 [P] Setup Prisma client singleton (copied from src/lib/db/prisma.ts) in backend/src/lib/prisma.ts
- [x] T008 Convert auth middleware from NextRequest to Express (req, res, next) pattern in backend/src/middleware/auth.ts using backend/next-api-legacy/lib/middleware.ts as source
- [x] T009 [P] Create error handler middleware with standardized JSON error responses in backend/src/middleware/error-handler.ts using backend/next-api-legacy/lib/error-handler.ts as source
- [x] T010 Create health check route GET /api/health returning { status: "ok" } in backend/src/routes/health.ts
- [x] T011 Configure Vite dev server proxy: /api → http://localhost:3001 in vite.config.ts

**Checkpoint**: `cd backend && npm install && npm run dev` starts Express on port 3001; `curl http://localhost:3001/api/health` returns `{ "status": "ok" }`; Vite proxies `/api/*` to backend

---

## Phase 3: User Story 1 — Developer Builds and Runs Without Next.js (Priority: P1) 🎯 MVP

**Goal**: Verify the application builds and runs using only Vite tooling with zero Next.js dependencies.

**Independent Test**: Run `npm install && npm run dev && npm run build` — all succeed with zero `next/` package references.

### Implementation for User Story 1

- [x] T012 [US1] Verify next package and all next-prefixed packages are absent from package.json dependencies and devDependencies
- [x] T013 [P] [US1] Search entire src/ directory for any remaining next/ imports and fix if found
- [x] T014 [P] [US1] Run npm run build and confirm zero errors referencing next/ modules
- [x] T015 [US1] Run npx tsc --noEmit and confirm zero TypeScript errors in frontend codebase

**Checkpoint**: App builds and runs with Vite alone. This is the MVP — verify before proceeding.

---

## Phase 4: User Story 2 — All Pages Render with Pure React Router Navigation (Priority: P1)

**Goal**: All 12 page routes plus a new 404 catch-all render correctly with react-router-dom.

**Independent Test**: Navigate through every route (/, /dashboard, /portfolios, /portfolios/:id, /portfolios/:id/holdings/:symbol, /transactions/:portfolioId, /strategy-builder, /technical-analysis, /fibonacci-tool, /backtest-results/:id, /login, /register, /nonexistent) — all render without errors.

### Implementation for User Story 2

- [x] T016 [P] [US2] Create NotFoundPage component (zh-TW "找不到頁面" message with link to dashboard) in src/app/not-found/page.tsx
- [x] T017 [US2] Add catch-all `{ path: '*', element: <NotFoundPage /> }` route to children array in src/routes.tsx with import for NotFoundPage
- [x] T018 [US2] Verify all 12 existing page routes plus 404 catch-all render correctly via browser navigation

**Checkpoint**: All routes accessible, 404 page displays for unknown URLs

---

## Phase 5: User Story 3 — Remove 'use client' Directives and Server Component Patterns (Priority: P2)

**Goal**: Remove all `'use client'` / `'use server'` directives from the codebase. Zero results on codebase-wide search.

**Independent Test**: `grep -r "'use client'" src/` and `grep -r "'use server'" src/` both return zero results.

### Implementation for User Story 3

- [x] T019 [US3] Remove 'use client' directive from 4 example files: src/components/charts/CandlestickPatternMarker.example.tsx, src/components/charts/StrategyConditionBuilder.example.tsx, src/components/charts/SupportResistanceLines.example.tsx, src/components/charts/TechnicalScoreCard.example.tsx
- [x] T020 [US3] Verify zero 'use client' and 'use server' directives remain in entire src/ directory and confirm no Next.js Metadata type imports exist

**Checkpoint**: Codebase free of all React Server Component patterns

---

## Phase 6: User Story 4 — API Routes Extracted and Marked for Backend Separation (Priority: P2)

**Goal**: Convert all 43 API handlers from NextRequest/NextResponse to Express pattern, migrate Prisma-dependent services to backend, create frontend API client, and produce endpoint inventory document.

**Independent Test**: Zero `next/server` imports in backend/src/; all 43 endpoints respond correctly via curl/supertest; frontend calls API via axios; endpoint inventory document is complete.

### Route Infrastructure

- [x] T021 [US4] Create route registry aggregating all domain routers with auth middleware in backend/src/routes/index.ts

### Handler Conversion — NextRequest/NextResponse → Express (req, res)

> All handler conversion tasks are [P] — each domain is independent and can be converted in parallel. Source files are in `backend/next-api-legacy/{domain}/`. Target files are `backend/src/routes/{domain}.ts`.

- [x] T022 [P] [US4] Convert auth handlers (POST login, POST logout, POST register, GET me — 4 endpoints) from backend/next-api-legacy/auth/ to backend/src/routes/auth.ts
- [x] T023 [P] [US4] Convert portfolios handlers (GET/POST list, GET/PUT/DELETE by id, GET holdings, GET transactions — 4 handler files) from backend/next-api-legacy/portfolios/ to backend/src/routes/portfolios.ts
- [x] T024 [P] [US4] Convert transactions handlers (POST create, PUT/DELETE by id, GET export, POST import — 4 handler files) from backend/next-api-legacy/transactions/ to backend/src/routes/transactions.ts
- [x] T025 [P] [US4] Convert stocks handlers (GET search, GET price, GET history — 3 handler files) from backend/next-api-legacy/stocks/ to backend/src/routes/stocks.ts
- [x] T026 [P] [US4] Convert indicators handlers (GET atr, bollinger, macd, rsi, support-resistance, technical-score, candlestick-patterns, fibonacci/retracement, fibonacci/extension, GET|POST cache/clear — 10 handler files) from backend/next-api-legacy/indicators/ to backend/src/routes/indicators.ts
- [x] T027 [P] [US4] Convert strategies handlers (GET/POST list, GET/PUT/DELETE by id, GET backtest — 3 handler files) from backend/next-api-legacy/strategies/ to backend/src/routes/strategies.ts
- [x] T028 [P] [US4] Convert news handlers (GET by symbol, GET sources, GET sentiment, GET portfolio news — 4 handler files) and dashboard news (GET — 1 handler file) from backend/next-api-legacy/news/ and backend/next-api-legacy/dashboard/ to backend/src/routes/news.ts
- [x] T029 [P] [US4] Convert risk-assessment handlers (GET by symbol, POST batch, GET by portfolio — 3 handler files) from backend/next-api-legacy/risk-assessment/ to backend/src/routes/risk-assessment.ts
- [x] T030 [P] [US4] Convert realized-pl handlers (GET query, GET by portfolio — 2 handler files) from backend/next-api-legacy/realized-pl/ to backend/src/routes/realized-pl.ts
- [x] T031 [P] [US4] Convert holding-advice handlers (GET by symbol, GET by portfolio — 2 handler files) from backend/next-api-legacy/holding-advice/ to backend/src/routes/holding-advice.ts
- [x] T032 [P] [US4] Convert misc handlers (POST sync/dashboard-news, GET query-tsm, GET holdings/export — 3 handler files) from backend/next-api-legacy/ to backend/src/routes/misc.ts

### Prisma Service Migration — src/services/ → backend/src/services/

> All service migration tasks are [P] — each group is independent. Pure calculation services (atr, bollinger-bands, candlestick-pattern, fibonacci, indicator-optimization, macd, rsi, support-resistance, technical-score) remain in src/services/ as they have no Prisma dependency.

- [x] T033 [P] [US4] Migrate auth.service.ts and portfolio.service.ts from src/services/ to backend/src/services/
- [x] T034 [P] [US4] Migrate transaction.service.ts and stock.service.ts from src/services/ to backend/src/services/
- [x] T035 [P] [US4] Migrate news.service.ts, dashboard-news.service.ts, and dashboard-news-sync.service.ts from src/services/ to backend/src/services/
- [x] T036 [P] [US4] Migrate strategy.service.ts, risk-assessment.service.ts, and holding-advice.service.ts from src/services/ to backend/src/services/
- [x] T037 [P] [US4] Migrate remaining Prisma-dependent services (realized-pl.service.ts, sentiment-analysis.service.ts, credibility.service.ts, chart.service.ts, indicator-cache.service.ts, tax-lot.service.ts) from src/services/ to backend/src/services/

### Frontend API Client Layer

- [x] T038 [US4] Create frontend API client (axios wrapper with base URL from VITE_API_URL, cookie credentials, error interceptor) in src/services/api-client.ts
- [x] T039 [US4] Create frontend service wrappers calling API client for all domains (portfolio.api.ts, transaction.api.ts, stock.api.ts, news.api.ts, strategy.api.ts, risk-assessment.api.ts, auth.api.ts, etc.) in src/services/
- [ ] T040 [US4] Update all component imports (~20 components) to use new frontend API service wrappers instead of direct Prisma service calls
- [x] T041 [US4] Remove src/lib/db/ directory (Prisma client) from frontend and remove @prisma/client + prisma from root package.json dependencies

### Tests & Documentation

- [x] T042 [P] [US4] Migrate 15 API test files from NextRequest mocks to Express/supertest format in backend/src/__tests__/ (sources: backend/next-api-legacy/indicators/__tests__/ (9 files), backend/next-api-legacy/strategies/__tests__/ (3 files), backend/next-api-legacy/__tests_api__/ (3 files))
- [x] T043 [P] [US4] Create comprehensive API endpoint inventory (43 endpoints with HTTP method, path, purpose zh-TW, auth requirement, request/response shape) in docs/api-inventory.md

**Checkpoint**: All 43 API endpoints respond correctly via Express backend. Frontend calls API via axios client. Zero `next/server` imports. Endpoint inventory complete. Backend can be deployed independently.

---

## Phase 7: User Story 5 — Environment Configuration Fully Standardized (Priority: P3)

**Goal**: All client-side env vars use `import.meta.env.VITE_*`. Zero `NEXT_PUBLIC_*` prefixes. Zero client-side `process.env`.

**Independent Test**: Search all `.env*` files and `src/` for `NEXT_PUBLIC_` — zero results. Search `src/` for `process.env` — zero results (server-side files in `backend/` may use `process.env`).

### Implementation for User Story 5

- [x] T044 [US5] Replace `process.env.NODE_ENV === 'development'` with `import.meta.env.DEV` at line 97 in src/components/ui/ErrorBoundary.tsx
- [x] T045 [US5] Audit all .env files (.env, .env.example, .env.test) for NEXT_PUBLIC_ prefixes and search all src/ code for remaining process.env usage — fix any found

**Checkpoint**: Client code uses only `import.meta.env`, zero `NEXT_PUBLIC_` or `process.env` in frontend

---

## Phase 8: User Story 6 — Project Configuration Files Cleaned Up (Priority: P3)

**Goal**: No Next.js config files remain. Vite is the sole build configuration. No ambiguity about build system.

**Independent Test**: Verify `next.config.js` and `next-env.d.ts` do not exist. `tsconfig.json` has no Next.js type references. `vite.config.ts` includes aliases, dev server, build output config.

### Implementation for User Story 6

- [x] T046 [P] [US6] Verify tsconfig.json contains no Next.js type references or plugins and update if needed
- [x] T047 [P] [US6] Verify vite.config.ts contains complete configuration: path aliases (@/ → ./src/), dev server settings, build output configuration, /api proxy
- [x] T048 [US6] Update vercel.json to remove cron job configuration (cron moved to backend scheduler or external service)

**Checkpoint**: Project has unambiguous Vite-only build configuration

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: CI/CD, documentation, final validation, and cleanup across all stories

- [x] T049 [P] Create CI pipeline (lint + type-check + test frontend + test backend + build) in .github/workflows/ci.yml
- [x] T050 [P] Create CD pipeline (build + deploy frontend static + deploy backend Docker) in .github/workflows/deploy.yml
- [x] T051 [P] Create docker-compose.yml for local development environment (frontend + backend + PostgreSQL)
- [x] T052 Add unified dev startup script (npm run dev:full — launches Vite:3000 + Express:3001 concurrently) in package.json
- [x] T053 [P] Update README.md with new architecture diagram, setup instructions, and development workflow
- [x] T054 [P] Create backend/README.md with API documentation, setup guide, and endpoint reference
- [x] T055 Update .specify/memory/constitution.md Technology Stack: "Next.js 15 with App Router" → "Vite 6 with React Router v7 (React SPA) + Express backend"
- [x] T056 Delete backend/next-api-legacy/ directory after confirming all handlers migrated and tests passing
- [ ] T057 Run quickstart.md full validation checklist (zero next/ imports, zero 'use client', build success, tsc passes, all tests pass, dev server < 5s startup)
- [ ] T058 Verify all 8 success criteria from specs/001-vite-migration/spec.md: SC-001 (build < 60s), SC-002 (12 routes work), SC-003 (zero next/ imports), SC-004 (zero directives), SC-005 (inventory complete), SC-006 (tests pass), SC-007 (dev < 5s), SC-008 (bundle < +10%)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS US4 only
- **US1 (Phase 3)**: No dependency on Phase 1/2 — can start immediately (verification of current state)
- **US2 (Phase 4)**: No dependency on Phase 1/2 — can start immediately (frontend-only)
- **US3 (Phase 5)**: No dependency on Phase 1/2 — can start immediately (frontend-only)
- **US4 (Phase 6)**: Depends on Phase 2 (Foundational) — backend infrastructure must exist
  - Handler conversion (T022–T032) depends on T021 (route registry)
  - Service migration (T033–T037) can start in parallel with handler conversion
  - Frontend API client (T038–T041) depends on handler conversion + service migration
  - Tests & docs (T042–T043) can run in parallel with service migration
- **US5 (Phase 7)**: No dependency on Phase 1/2 — can start immediately (frontend-only)
- **US6 (Phase 8)**: No dependency on Phase 1/2 — can start immediately (config-only)
- **Polish (Phase 9)**: Depends on ALL user stories being complete
  - T056 (delete legacy) specifically requires US4 fully verified

### User Story Dependencies

- **US1 (P1)**: Independent — verification of existing state
- **US2 (P1)**: Independent — frontend routing addition
- **US3 (P2)**: Independent — directive removal only
- **US4 (P2)**: Depends on Setup + Foundational phases; largest work item
- **US5 (P3)**: Independent — env var cleanup
- **US6 (P3)**: Independent — config file cleanup

### Within US4 (Largest Story)

```
T021 (route registry) ──┬──→ T022-T032 (handler conversion, all [P])
                        │
                        └──→ T033-T037 (service migration, all [P], parallel with above)
                                     │
T022-T032 + T033-T037 ──────→ T038 (API client) → T039 (wrappers) → T040 (imports) → T041 (remove Prisma)
                        │
                        ├──→ T042 (test migration, [P])
                        └──→ T043 (endpoint inventory, [P])
```

### Parallel Opportunities

| Parallel Group | Tasks | Reason |
|----------------|-------|--------|
| Immediate start (no backend needed) | US1 + US2 + US3 + US5 + US6 | All frontend/config — independent of backend setup |
| Backend handler conversion | T022–T032 (11 tasks) | Each API domain is completely independent |
| Backend service migration | T033–T037 (5 tasks) | Each service group is independent |
| Handler + Service (cross-group) | T022–T032 ∥ T033–T037 | Different files, no dependencies |
| Backend tests + inventory | T042 ∥ T043 | Independent documentation/test work |
| CI/CD + Docker | T049 ∥ T050 ∥ T051 | Infrastructure files, no overlap |
| Documentation | T053 ∥ T054 | Different README files |
| Phase 2 internals | T007 ∥ T009 | Different middleware files |

---

## Parallel Example: User Story 4 (Largest Story)

```bash
# Step 1: Route registry (sequential prerequisite)
Task: T021 "Create route registry in backend/src/routes/index.ts"

# Step 2: Launch ALL handler conversions + service migrations in parallel (16 tasks):
Task: T022 "Convert auth handlers in backend/src/routes/auth.ts"
Task: T023 "Convert portfolios handlers in backend/src/routes/portfolios.ts"
Task: T024 "Convert transactions handlers in backend/src/routes/transactions.ts"
Task: T025 "Convert stocks handlers in backend/src/routes/stocks.ts"
Task: T026 "Convert indicators handlers in backend/src/routes/indicators.ts"
Task: T027 "Convert strategies handlers in backend/src/routes/strategies.ts"
Task: T028 "Convert news handlers in backend/src/routes/news.ts"
Task: T029 "Convert risk-assessment handlers in backend/src/routes/risk-assessment.ts"
Task: T030 "Convert realized-pl handlers in backend/src/routes/realized-pl.ts"
Task: T031 "Convert holding-advice handlers in backend/src/routes/holding-advice.ts"
Task: T032 "Convert misc handlers in backend/src/routes/misc.ts"
Task: T033 "Migrate auth & portfolio services to backend/src/services/"
Task: T034 "Migrate transaction & stock services to backend/src/services/"
Task: T035 "Migrate news & dashboard services to backend/src/services/"
Task: T036 "Migrate strategy & risk services to backend/src/services/"
Task: T037 "Migrate remaining services to backend/src/services/"

# Step 3: Tests & docs in parallel (while step 2 completes):
Task: T042 "Migrate API tests to Jest/supertest in backend/src/__tests__/"
Task: T043 "Create endpoint inventory in docs/api-inventory.md"

# Step 4: Frontend API client (sequential, after step 2):
Task: T038 → T039 → T040 → T041
```

## Parallel Example: All Frontend Stories (Can Start Day 1)

```bash
# These 5 user stories have ZERO dependency on backend setup:
Task: T012-T015 (US1 - Build verification)
Task: T016-T018 (US2 - 404 route)
Task: T019-T020 (US3 - Remove directives)
Task: T044-T045 (US5 - Env config)
Task: T046-T048 (US6 - Config cleanup)

# All can run in parallel with Phase 1 + Phase 2 backend setup
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (verify build — can start immediately)
2. **STOP and VALIDATE**: `npm run build && npm run dev` both succeed
3. The app already works without Next.js — this confirms it

### Incremental Delivery

1. **Day 1**: US1 (verify) + US2 (404) + US3 (directives) + US5 (env) + US6 (config) — all frontend, all parallel
2. **Day 1–2**: Phase 1 + Phase 2 (backend setup) — runs in parallel with frontend stories
3. **Day 3–8**: US4 (API extraction) — largest work, 43 handlers + 16 services + frontend API client
4. **Day 9–10**: Polish — CI/CD, docs, final validation
5. Each increment adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Developer A** (Day 1): US1 + US2 + US3 + US5 + US6 (all frontend cleanup)
2. **Developer B** (Day 1–2): Phase 1 + Phase 2 (backend infrastructure)
3. **Day 3+**: Both developers split US4 handler domains:
   - Developer A: auth, portfolios, transactions, stocks, strategies (T022–T025, T027)
   - Developer B: indicators, news, risk-assessment, realized-pl, holding-advice, misc (T026, T028–T032)
4. Frontend API client (T038–T041): Whoever finishes first
5. Polish: Split documentation and CI/CD tasks

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [USx] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Conversion pattern reference: research.md 研究 1 (NextRequest → Express mapping table)
- 9 pure calculation services stay in src/services/ (no Prisma): atr, bollinger-bands, candlestick-pattern, fibonacci, indicator-optimization, macd, rsi, support-resistance, technical-score
- 16 Prisma-dependent services migrate to backend/src/services/
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Legacy directory (backend/next-api-legacy/) preserved until T056 in Polish phase
