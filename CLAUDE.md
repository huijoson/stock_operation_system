# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A full-stack stock portfolio management system for Taiwan individual investors
(股市投資組合管理系統). Tracks holdings, transactions, realized P&L, technical
indicators, risk assessment, holding advice, and financial news.

## Architecture (the big picture)

Three tiers, all TypeScript:

- **Frontend** — Vite + React 18 SPA using **React Router v7** (`src/`). Served on port 3000.
- **Backend** — Express + TypeScript API (`backend/src/`). Served on port 3001.
- **Data** — PostgreSQL via **Prisma ORM**. The Prisma schema and client are owned by
  the repo root (`prisma/`), not by `backend/`; the backend imports the root-generated client.

In dev, Vite proxies `/api/*` to `http://127.0.0.1:3001` (see `vite.config.ts`), so the
frontend always talks to the backend through relative `/api` URLs. The axios client
(`src/services/api-client.ts`) uses `withCredentials` (cookie-based sessions) and redirects
to `/login` on 401.

### Frontend service layer has two distinct kinds of files (important)

In `src/services/` you will find files with two suffixes that do very different things:

- `*.api.ts` (e.g. `portfolio.api.ts`, `transaction.api.ts`) — thin wrappers that call
  the backend over HTTP via `api-client`. These are how the UI fetches data.
- `*.service.ts` (e.g. `rsi.service.ts`, `macd.service.ts`) — **pure client-side
  calculation logic** (technical indicators) that mirrors the backend's own
  `backend/src/services/*.service.ts`. The same indicator math exists on both sides.
  When changing indicator behavior, check whether both copies need updating.

### Backend request flow

`backend/src/server.ts` → `app.ts` (CORS + JSON body limit 10mb for CSV imports + cookie
parser) → `routes/index.ts` registers all domain routers. Most routes are gated by
`authMiddleware`; exceptions: `/health` (none) and `/api/auth`, `/api/news` (mixed). Each
route delegates to a `backend/src/services/*.service.ts`, which is where business logic lives.

### Rust technical indicators (native addon with TS fallback)

`rust/technical-indicators` (core crate) and `rust/technical-indicators-node` (Node binding)
provide native implementations of RSI/MACD/Bollinger. The backend loads them through
`backend/src/lib/rust-indicators/` adapters with a TS fallback. Behavior is controlled by
the `RUST_INDICATORS_MODE` env var: `auto` (default — native if available, else TS),
`native-only` (throw if missing), `ts-only`. Code should not assume the native addon is
present.

### Financial precision

All money/quantity math uses **Decimal.js**, never native floats. Helpers live in
`src/lib/calculations/decimal-utils.ts` and `backend/src/lib/calculations/decimal-utils.ts`.

### Data model

Prisma models (`prisma/schema.prisma`) include: `User`, `Session`, `Portfolio`, `Holding`,
`Transaction`, `Stock`, `StockPrice`, `IndicatorCache`, `Strategy`, `Backtest`,
`StrategySignal`, `CandlestickPattern`, `TaxLot`, `RealizedPL`, `RiskAssessment`,
`HoldingAdvice`, `DashboardNewsItem`, `SyncQuotaLog`, `StockNews`, `NewsSourceRating`.
Realized P&L is FIFO-based and backed by `TaxLot` records.

## Commands

Run from the repo root unless noted.

```bash
npm install              # also runs postinstall: prisma generate + playwright chromium

# Dev
npm run dev              # frontend only (Vite, :3000)
npm run backend:dev      # backend only (ts-node, :3001) — also runs prisma generate
npm run dev:full         # both concurrently

# Build / run
npm run build            # tsc --noEmit then vite build (frontend)
npm run backend:build    # tsc -> backend/dist
npm run backend:start    # node backend/dist/server.js

# Quality
npm run lint             # eslint .ts/.tsx/.js/.jsx
npm run type-check       # tsc --noEmit
npm run format           # prettier --write .

# Tests (see note below — root vs backend are separate Jest projects)
npm test                 # root Jest: src/ + tests/ (excludes backend/)
npm run test:unit        # jest --testPathPattern=unit
npm run test:property    # jest --testPathPattern=property  (fast-check)
npm run test:coverage
npm run backend:test     # backend Jest, runs inside backend/
npx jest path/to/file.test.ts          # single file
npx jest -t "test name substring"      # single test by name

# Database (Prisma)
npm run db:migrate       # node scripts/db-migrate.mjs
npm run db:push          # node scripts/db-push.mjs (non-interactive)
npm run db:push:accept   # db:push with --accept-data-loss
npm run db:seed          # prisma db seed (prisma/seed.ts)
npm run db:studio
```

### Testing layout

Two separate Jest configurations. The **root** `jest.config.js` runs tests under `src/`
and `tests/` and **ignores `/backend/`** (`testPathIgnorePatterns`); it enforces 80%
coverage and maps `@/*` → `src/*` and `@backend/*` → `backend/*`. The **backend** has its
own `backend/jest.config.js` run via `npm run backend:test`. Unit tests live in
`tests/unit/`, property tests in `tests/property/`.

### Database connection / TLS gotcha

`db:migrate` / `db:push` go through `scripts/prisma-run.mjs`, which handles a common
self-signed-certificate failure (corporate proxy or local Postgres). If you hit
`self-signed certificate in certificate chain`, set `NODE_EXTRA_CA_CERTS` to the CA file,
or add `sslmode=require&sslrootcert=...` to `DATABASE_URL`. `prisma/migrations` is
gitignored. See `prisma/README.md`.

## Conventions

These come from `.specify/memory/constitution.md` (the project "constitution", which it
declares as superseding other practices). Highlights that are easy to get wrong:

- **TypeScript strict mode**; explicit return types on all functions; avoid `any` (document
  any exception).
- **Decimal.js for every financial calculation** — no native float arithmetic on money.
- **Prisma only** for DB access; no raw SQL without review.
- **Property-based tests (fast-check) are required** for calculation/data-transformation
  logic (commutativity, boundaries, round-trip). Coverage target 80% services / 70% overall.
- **All user-facing text is Traditional Chinese (zh-TW)** — UI labels, error messages,
  and the docs under `specs/` and `docs/`. Code comments and READMEs may be English.
- Files **kebab-case**, components **PascalCase**, vars **camelCase**, constants
  **UPPER_SNAKE_CASE**.
- Reusable UI in `src/components/ui/`, domain components in `src/components/{domain}/`.

## Spec-driven development

This repo uses spec-first workflows. Three relevant locations:

- `.specify/` — the active **Spec-Kit** setup: `memory/constitution.md` (non-negotiable
  rules), templates, and PowerShell scripts. Slash-command prompts live in `.github/prompts/`
  (see `AGENTS.md`).
- `specs/` — current feature specs (`001-portfolio-insights`, `001-vite-migration`,
  `002-dashboard-stock-news`), each with `plan.md`/`spec.md`.
- `.kiro/` — earlier Kiro-format specs and steering docs.

## Stale documentation warning

`.github/copilot-instructions.md` and `.kiro/steering/structure.md` describe the project as
**Next.js (App Router)**. That is outdated — the project was migrated to **Vite + React
Router v7** (see `specs/001-vite-migration` and `docs/vite-migration-structure-analysis.md`).
The directory `src/app/` is a leftover naming convention from the Next.js era, not Next.js
routing; routing is defined in `src/routes.tsx`. Trust `package.json`, `vite.config.ts`, and
the constitution's Technology Stack section over the copilot/kiro docs when they conflict.
```
