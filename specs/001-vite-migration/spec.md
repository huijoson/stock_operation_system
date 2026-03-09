# Feature Specification: Next.js to Vite (React SPA) Migration

**Feature Branch**: `001-vite-migration`  
**Created**: 2025-07-17  
**Status**: Draft  
**Input**: User description: "將目前的 Next.js 15 專案架構全面重構，前端遷移至 Vite (React SPA) 架構"

## Context & Current State

The stock portfolio management system (股市投資組合管理系統) is in a **hybrid state**: the project already uses Vite as its build tool with React Router DOM for client-side routing, but retains significant Next.js patterns throughout the codebase. Specifically:

- **65 files** still import from `next/` packages (`next/server`, `next/navigation`)
- **59 files** contain the `'use client'` directive (unnecessary in a pure Vite SPA)
- **57 API route files** under `src/app/api/` use the Next.js Route Handler pattern (`NextRequest`/`NextResponse`)
- The root layout (`src/app/layout.tsx`) imports Next.js `Metadata` type
- A `next.config.js` file exists at the project root

The project already has in place: `vite.config.ts`, `index.html`, `src/main.tsx` with `BrowserRouter`, `react-router-dom` 7.6.0, and `VITE_` prefixed environment variables.

This migration completes the transition by removing all remaining Next.js dependencies, patterns, and conventions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Builds and Runs the App Without Next.js (Priority: P1)

As a developer, I want to build and run the application using only Vite tooling so that the project has no dependency on Next.js and starts faster with a simpler build pipeline.

**Why this priority**: This is the foundation — removing the `next` package and ensuring the app compiles and runs cleanly with Vite alone. All other stories depend on this being complete.

**Independent Test**: Run `npm install && npm run dev && npm run build` successfully with zero Next.js packages in `node_modules`. Verify the app renders the login page and dashboard without errors.

**Acceptance Scenarios**:

1. **Given** the `next` package and all `next`-related dependencies are removed from `package.json`, **When** a developer runs `npm install && npm run build`, **Then** the build completes successfully with zero errors referencing `next/` imports.
2. **Given** the project is freshly cloned, **When** a developer runs `npm run dev`, **Then** the Vite dev server starts and the application is accessible at the configured port.
3. **Given** the production build is generated, **When** the output is served statically, **Then** all pages render correctly with no console errors related to missing modules.

---

### User Story 2 - All Pages Render with Pure React Router Navigation (Priority: P1)

As a user, I want all pages to load and navigate correctly so that the application works identically to before the migration with no broken links or missing routes.

**Why this priority**: Navigation is core user-facing functionality. Any broken routes directly block users from accessing features.

**Independent Test**: Navigate through every route in the application (dashboard, portfolios, portfolio detail, holding detail, transactions, technical analysis, strategy builder, fibonacci tool, login, register) and verify each renders correctly.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they click a navigation link, **Then** the target page renders without errors or blank screens.
2. **Given** a user accesses a dynamic route (e.g., portfolio detail with a specific ID), **When** the page loads, **Then** the correct data for that entity is displayed.
3. **Given** all `next/navigation` imports have been replaced with `react-router-dom` equivalents, **When** any component using `useRouter`, `useParams`, or `usePathname` renders, **Then** it functions identically to the previous behavior.
4. **Given** a user navigates to a non-existent route, **When** the page loads, **Then** a user-friendly 404 page is displayed.

---

### User Story 3 - Remove 'use client' Directives and Server Component Patterns (Priority: P2)

As a developer, I want all `'use client'` directives and React Server Component patterns removed so that the codebase is clean, idiomatic Vite/React, and avoids confusion about component rendering model.

**Why this priority**: While `'use client'` directives don't cause runtime errors in Vite, they add noise, confuse new developers, and signal an incomplete migration.

**Independent Test**: Search the entire codebase for `'use client'`, `'use server'`, and Next.js `Metadata` type imports — zero results should be found. All 59 affected files should be pure client React components.

**Acceptance Scenarios**:

1. **Given** a file previously containing `'use client'`, **When** the directive is removed, **Then** the component renders and behaves identically.
2. **Given** `src/app/layout.tsx` previously imported `Metadata` from `next`, **When** the import is removed and replaced with standard HTML `<head>` management, **Then** the page title, description, and meta tags are correctly set.
3. **Given** a developer searches for `'use client'` or `'use server'` across the codebase, **When** the search completes, **Then** zero results are returned.

---

### User Story 4 - API Routes Extracted and Marked for Backend Separation (Priority: P2)

As a developer, I want all 57 API route handlers extracted from the Next.js Route Handler pattern and clearly organized for future backend implementation, so that the frontend is a pure SPA and backend logic has a clear migration path.

**Why this priority**: The API routes contain critical business logic (auth, portfolio management, stock data, indicators). They must be preserved and organized for the subsequent backend migration, but they block the removal of `next/server` imports.

**Independent Test**: Verify that all API route handler files have been moved/reorganized with their `NextRequest`/`NextResponse` usage replaced by standard request/response patterns, and that a clear inventory of all endpoints exists for backend migration.

**Acceptance Scenarios**:

1. **Given** all 57 API route files currently import `NextRequest`/`NextResponse` from `next/server`, **When** the migration is complete, **Then** zero files import from `next/server`.
2. **Given** the API routes are extracted, **When** a developer inspects the backend folder structure, **Then** all routes are organized by domain (auth, portfolios, transactions, indicators, strategies, news, risk, stocks) with their original logic preserved.
3. **Given** the frontend calls API endpoints via `axios`, **When** the backend routes are served separately, **Then** the frontend functions identically by pointing to the backend URL.
4. **Given** an inventory document lists all extracted endpoints, **When** a developer reviews it, **Then** every endpoint includes its HTTP method, path, purpose, and authentication requirements.

---

### User Story 5 - Environment Configuration Fully Standardized (Priority: P3)

As a developer, I want all environment variables to follow a single consistent convention (Vite's `VITE_` prefix for client-exposed variables) with no remnants of `NEXT_PUBLIC_` prefixes, so that configuration is clear and predictable.

**Why this priority**: Environment variable standardization is low-risk but necessary for a clean migration. The project already uses `VITE_` prefix, so this is primarily a verification/cleanup task.

**Independent Test**: Search all `.env*` files and all source code for `NEXT_PUBLIC_` — zero results should be found. Verify all client-accessible env vars use `import.meta.env.VITE_*`.

**Acceptance Scenarios**:

1. **Given** all `.env` files have been audited, **When** a developer searches for `NEXT_PUBLIC_`, **Then** zero occurrences are found.
2. **Given** environment variables are accessed in client code, **When** using `import.meta.env.VITE_*`, **Then** the values are correctly resolved at build time and runtime.
3. **Given** `process.env` references exist in client-side code, **When** they are replaced with `import.meta.env`, **Then** the application behaves identically.

---

### User Story 6 - Project Configuration Files Cleaned Up (Priority: P3)

As a developer, I want all Next.js configuration files removed and Vite configuration verified as the sole build configuration, so that there is no ambiguity about the project's build system.

**Why this priority**: Configuration cleanup is the final polish. Removing `next.config.js` and ensuring `vite.config.ts` is comprehensive eliminates confusion.

**Independent Test**: Verify `next.config.js` is deleted, `next-env.d.ts` is deleted, and `vite.config.ts` contains all necessary configuration (path aliases, dev server, build output).

**Acceptance Scenarios**:

1. **Given** `next.config.js` exists at the project root, **When** the migration is complete, **Then** the file is deleted.
2. **Given** `next-env.d.ts` exists, **When** the migration is complete, **Then** the file is deleted and `tsconfig.json` no longer references Next.js types.
3. **Given** `vite.config.ts` is the sole build configuration, **When** the config is reviewed, **Then** it includes path aliases (`@/` → `./src/`), dev server settings, build output configuration, and environment variable handling.

---

### Edge Cases

- What happens when a component previously relied on Next.js automatic code-splitting? Vite handles code-splitting via dynamic `import()` and route-based lazy loading — verify no regressions in bundle size or load performance.
- How does the system handle the auth middleware that currently validates session tokens? The middleware pattern must be preserved for the backend extraction — it cannot simply be removed.
- What happens to the `src/app/` directory structure after migration? Routes should be reorganized from Next.js filesystem conventions (`[id]` dynamic segments) to standard React component organization.
- What if API routes reference Next.js-specific request/response helpers (headers, cookies)? Each usage must be mapped to standard Web API or Node.js equivalents.
- How are 404 routes handled without Next.js's `not-found.tsx` convention? React Router's catch-all route (`*`) must be configured.
- What happens to existing tests that import components with `'use client'` directives? Tests should pass identically after directive removal since the directive has no effect in test environments.

## Requirements *(mandatory)*

### Functional Requirements

**Dependency & Build System**

- **FR-001**: The system MUST build and run without the `next` package or any `next`-prefixed packages in dependencies or devDependencies.
- **FR-002**: The system MUST use Vite as the sole build tool, with `npm run dev`, `npm run build`, and `npm run preview` as the standard commands.
- **FR-003**: The production build output MUST be a static SPA bundle (HTML + JS + CSS) servable by any static file server.

**Routing & Navigation**

- **FR-004**: All page routes MUST use `react-router-dom` for navigation, with zero imports from `next/navigation` or `next/router`.
- **FR-005**: All 12 existing page routes (dashboard, portfolios, portfolio detail, holding detail, transactions, backtest results, technical analysis, strategy builder, fibonacci tool, login, register, home) MUST continue to function after migration.
- **FR-006**: Dynamic route parameters (portfolio ID, stock symbol, transaction portfolio ID, backtest ID) MUST be accessible via `react-router-dom` hooks (`useParams`).
- **FR-007**: Programmatic navigation (redirects after login, form submissions) MUST use `react-router-dom`'s `useNavigate` hook.
- **FR-008**: A catch-all 404 route MUST display a user-friendly "page not found" message for unmatched URLs.

**Component Cleanup**

- **FR-009**: All `'use client'` directives MUST be removed from every file in the codebase (59 files currently affected).
- **FR-010**: All `'use server'` directives, if any exist, MUST be removed.
- **FR-011**: The root layout component MUST NOT import `Metadata` or any type from the `next` package; page metadata MUST be managed through standard HTML or a client-side approach.
- **FR-012**: All image references previously using `next/image` MUST use standard HTML `<img>` elements (note: current codebase already does not use `next/image`, verify this remains true).

**API Route Extraction**

- **FR-013**: All 57 API route handler files MUST have their `NextRequest`/`NextResponse` imports removed and replaced with standard request/response patterns.
- **FR-014**: API route business logic (auth, CRUD operations, external API calls, data transformations) MUST be preserved intact during extraction.
- **FR-015**: Extracted API routes MUST be organized by domain: auth (4 endpoints), portfolios (4), transactions (3), stocks (3), news (5), indicators (11), strategies (3), risk-assessment (3), realized-pl (2), holding-advice (2), dashboard (1), sync (1), query-tsm (1).
- **FR-016**: An endpoint inventory document MUST be created listing each route's HTTP method, path, purpose, request/response shape, and whether it requires authentication.
- **FR-017**: The auth middleware (`src/lib/auth/middleware.ts`) session validation logic MUST be preserved for use in the backend.

**Environment Variables**

- **FR-018**: All client-side environment variable access MUST use `import.meta.env.VITE_*` syntax.
- **FR-019**: No `NEXT_PUBLIC_*` prefixed variables may exist in any `.env`, `.env.example`, `.env.test`, or `.env.local` files.
- **FR-020**: No `process.env` references may exist in client-side (browser) code; server-side/build-time scripts may continue to use `process.env`.

**Configuration Cleanup**

- **FR-021**: `next.config.js` MUST be deleted from the project root.
- **FR-022**: `next-env.d.ts` MUST be deleted from the project root.
- **FR-023**: `tsconfig.json` MUST NOT reference Next.js types or plugins.
- **FR-024**: `vite.config.ts` MUST be the sole build configuration and include: path aliases (`@/` → `./src/`), dev server configuration, and build output settings.

**Testing & Quality**

- **FR-025**: All existing unit tests MUST pass after migration with no modifications to test logic (only import path changes are acceptable).
- **FR-026**: The build process MUST produce zero TypeScript errors (`tsc --noEmit` passes).

## Assumptions

- The project is already partially migrated: `vite.config.ts`, `index.html`, `src/main.tsx`, and `react-router-dom` are already in place and working.
- The `next` package may or may not still be listed in `package.json` — if present, it must be removed; if already absent, this is a no-op.
- `next/link` and `next/image` are not currently used (already replaced with `react-router-dom` `Link` and standard `<img>`), so those migration steps are verification-only.
- API route extraction targets a clear folder structure suitable for future Express/Fastify backend migration, but the actual backend server implementation is **out of scope** for this feature.
- The PostgreSQL database, Prisma ORM setup, and all data models remain unchanged.
- No changes to the visual UI, styling (Tailwind CSS), or user-facing behavior — this is a transparent infrastructure migration.
- The `VITE_` environment variable prefix is already in use; the cleanup is primarily verification that no `NEXT_PUBLIC_` remnants exist.
- Existing React Router route definitions in `src/routes` are the source of truth for routing and do not need to be recreated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The application builds successfully (`npm run build`) with zero errors and zero references to `next` packages in under 60 seconds.
- **SC-002**: All 12 page routes render correctly and are navigable — users can access every feature of the application without encountering broken pages.
- **SC-003**: Zero files in the codebase contain imports from `next/` packages (verified by codebase-wide search).
- **SC-004**: Zero files contain `'use client'` or `'use server'` directives (verified by codebase-wide search).
- **SC-005**: All 57 API endpoints are documented in an endpoint inventory with HTTP method, path, auth requirements, and purpose — enabling a developer unfamiliar with the project to understand and implement the backend.
- **SC-006**: All existing unit tests pass with no test logic changes (import path adjustments only).
- **SC-007**: The Vite dev server starts and the application is interactive within 5 seconds of running `npm run dev`.
- **SC-008**: Bundle size does not increase by more than 10% compared to the pre-migration build (accounting for removal of Next.js server-side code).
