# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

A full-stack stock portfolio management system for Taiwan individual investors
(股市投資組合管理系統). Tracks holdings, transactions, realized P&L, technical
indicators, risk assessment, holding advice, and financial news.

## Architecture

Three tiers, all TypeScript:

- **Frontend** — Vite + React 18 SPA using **React Router v7** (`src/`). Port 3000.
- **Backend** — Express + TypeScript API (`backend/src/`). Port 3001.
- **Data** — PostgreSQL via **Prisma ORM**. The Prisma schema and client are owned by
  the repo root (`prisma/`), not by `backend/`; the backend imports the root-generated client.

In dev, Vite proxies `/api/*` to `http://127.0.0.1:3001` (see `vite.config.ts`), so the
frontend always talks to the backend through relative `/api` URLs. The axios client
(`src/services/api-client.ts`) uses `withCredentials` (cookie-based sessions) and redirects
to `/login` on 401.

### Frontend service layer: two kinds of files

In `src/services/` two suffixes do very different things:

- `*.api.ts` — thin HTTP wrappers over `api-client`; how the UI fetches data.
- `*.service.ts` — **pure client-side calculation** (technical indicators) that mirrors the
  backend's `backend/src/services/*.service.ts`. The same indicator math exists on both sides.
  When changing indicator behavior, check whether both copies need updating.

### Backend request flow

`backend/src/server.ts` → `app.ts` (CORS + JSON body limit 10mb for CSV imports + cookie
parser) → `routes/index.ts` registers all domain routers. Most routes are gated by
`authMiddleware`; exceptions: `/health` (none) and `/api/auth`, `/api/news` (mixed). Each
route delegates to a `backend/src/services/*.service.ts`, where business logic lives.

### Rust technical indicators (native addon with TS fallback)

`rust/technical-indicators` (core) and `rust/technical-indicators-node` (Node binding) provide
native RSI/MACD/Bollinger. The backend loads them through `backend/src/lib/rust-indicators/`
adapters with a TS fallback. `RUST_INDICATORS_MODE` env var: `auto` (default — native if
available, else TS), `native-only` (throw if missing), `ts-only`. Don't assume the native
addon is present.

### Financial precision

All money/quantity math uses **Decimal.js**, never native floats. Helpers live in
`src/lib/calculations/decimal-utils.ts` and `backend/src/lib/calculations/decimal-utils.ts`.

### Data model

Prisma models (`prisma/schema.prisma`): `User`, `Session`, `Portfolio`, `Holding`,
`Transaction`, `Stock`, `StockPrice`, `IndicatorCache`, `Strategy`, `Backtest`,
`StrategySignal`, `CandlestickPattern`, `TaxLot`, `RealizedPL`, `RiskAssessment`,
`HoldingAdvice`, `DashboardNewsItem`, `SyncQuotaLog`, `StockNews`, `NewsSourceRating`.
Realized P&L is FIFO-based and backed by `TaxLot` records.

## Commands

Scripts live in `package.json` — read them there. Two gotchas the scripts don't confess:

- **Two separate Jest projects.** Root `jest.config.js` runs `src/` + `tests/` and **ignores
  `/backend/`**; the backend has its own `backend/jest.config.js` run via `npm run backend:test`.
  Root enforces 80% coverage and maps `@/*` → `src/*`, `@backend/*` → `backend/*`.
- **TLS gotcha.** `db:migrate` / `db:push` go through `scripts/prisma-run.mjs`, which handles a
  common self-signed-certificate failure. On `self-signed certificate in certificate chain`,
  set `NODE_EXTRA_CA_CERTS` to the CA file, or add `sslmode=require&sslrootcert=...` to
  `DATABASE_URL`. `prisma/migrations` is gitignored. See `prisma/README.md`.

## Conventions

From `.specify/memory/constitution.md` (the project "constitution", superseding other
practices). Easy to get wrong:

- **TypeScript strict mode**; explicit return types; avoid `any` (document exceptions).
- **Decimal.js for every financial calculation** — no native float arithmetic on money.
- **Prisma only** for DB access; no raw SQL without review.
- **Property-based tests (fast-check) required** for calculation/data-transformation logic
  (commutativity, boundaries, round-trip). Coverage target 80% services / 70% overall.
- **All user-facing text is Traditional Chinese (zh-TW)** — UI labels, error messages, and
  docs under `specs/` and `docs/`. Code comments and READMEs may be English.
- Files **kebab-case**, components **PascalCase**, vars **camelCase**, constants
  **UPPER_SNAKE_CASE**.
- Reusable UI in `src/components/ui/`, domain components in `src/components/{domain}/`.

## Spec-driven development

- `.specify/` — active **Spec-Kit** setup: `memory/constitution.md`, templates, PowerShell
  scripts. Slash-command prompts live in `.github/prompts/`.
- `specs/` — current feature specs (`001-portfolio-insights`, `001-vite-migration`,
  `002-dashboard-stock-news`), each with `plan.md`/`spec.md`.
- `.kiro/` — earlier Kiro-format specs and steering docs.

## Stale documentation warning

`.github/copilot-instructions.md` and `.kiro/steering/structure.md` describe the project as
**Next.js (App Router)**. That is outdated — the project was migrated to **Vite + React
Router v7** (see `specs/001-vite-migration` and `docs/vite-migration-structure-analysis.md`).
`src/app/` is a leftover naming convention, not Next.js routing; routing is defined in
`src/routes.tsx`. Trust `package.json`, `vite.config.ts`, and the constitution's Technology
Stack section over the copilot/kiro docs when they conflict.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles mapped to default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
