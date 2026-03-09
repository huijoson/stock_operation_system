# API & Data-Flow Refactor Strategy

**Document**: `migration-plan-api-flow`
**Created**: 2025-07-18
**Status**: Complete
**Scope**: Transform Next.js legacy API handlers into standalone RESTful backend

---

## Table of Contents

1. [Route Transformation Plan](#1-route-transformation-plan)
2. [Framework Recommendation](#2-framework-recommendation-hono)
3. [CORS / Auth / Session Strategy](#3-cors--auth--session-strategy)
4. [API Versioning, Error Format & Validation](#4-api-versioning-error-format--validation)
5. [Data-Flow Diagram](#5-data-flow-diagram)

---

## 1. Route Transformation Plan

### 1.1 Current State

- **43 route handlers** in `backend/next-api-legacy/` organized by domain
- All handlers use `NextRequest`/`NextResponse` from `next/server`
- Services layer (`src/services/`) is **framework-agnostic** — clean class-based services with Prisma
- Auth uses cookie-based sessions with `session_token` httpOnly cookie
- Error handling via `ApplicationError` class + `handleApiError()` wrapper
- Validation is **inline** (manual `if (!field)` checks) — no schema library

### 1.2 Domain Inventory (43 routes → 15 domains)

| Domain | Routes | Auth Required | Methods |
|---|---|---|---|
| auth | 4 | No (public) | POST, GET |
| portfolios | 4 | Yes | GET, POST, PUT, DELETE |
| transactions | 4 | Yes | GET, POST, PUT, DELETE, Import/Export |
| holdings | 1 | Yes | GET (export) |
| stocks | 3 | No | GET |
| indicators | 10 | No | GET, POST (cache clear) |
| news | 4 | No | GET |
| risk-assessment | 3 | No* | GET, POST |
| holding-advice | 2 | No* | GET |
| realized-pl | 2 | Yes* | GET |
| strategies | 3 | Yes | GET, POST, PUT, DELETE |
| dashboard | 1 | No | GET |
| sync | 1 | No† | POST |
| query-tsm | 1 | No | GET |

*Some routes use portfolio context which implies auth. †Sync should be protected in production.

### 1.3 Transformation Steps (Phase-by-Phase)

#### Phase 1 — Scaffold Backend App (`backend/src/`)

```
backend/
├── src/
│   ├── index.ts              # Hono app entry point
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── portfolios.routes.ts
│   │   ├── transactions.routes.ts
│   │   ├── holdings.routes.ts
│   │   ├── stocks.routes.ts
│   │   ├── indicators.routes.ts
│   │   ├── news.routes.ts
│   │   ├── risk-assessment.routes.ts
│   │   ├── holding-advice.routes.ts
│   │   ├── realized-pl.routes.ts
│   │   ├── strategies.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── sync.routes.ts
│   │   └── query-tsm.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── validation.middleware.ts
│   ├── validators/            # Zod schemas per domain
│   │   ├── auth.schema.ts
│   │   ├── portfolio.schema.ts
│   │   ├── transaction.schema.ts
│   │   └── ...
│   └── lib/
│       ├── prisma.ts          # Re-export from shared
│       └── response.ts        # Standardized response helpers
├── tsconfig.json              # Backend-specific TS config
├── package.json               # Backend dependencies
└── next-api-legacy/           # Existing (to be removed after migration)
```

#### Phase 2 — Migrate Handler by Handler

For each legacy handler, the transformation is mechanical:

**Before** (Next.js pattern):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PortfolioService } from '@/services/portfolio.service'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const portfolioService = new PortfolioService()
  const portfolios = await portfolioService.getPortfolios(user.id)
  return NextResponse.json({ portfolios })
}
```

**After** (Hono pattern):
```typescript
import { Hono } from 'hono'
import { PortfolioService } from '@/services/portfolio.service'
import { authMiddleware } from '../middleware/auth.middleware'

const app = new Hono()

app.use('/*', authMiddleware)

app.get('/', async (c) => {
  const userId = c.get('userId')
  const portfolioService = new PortfolioService()
  const portfolios = await portfolioService.getPortfolios(userId)
  return c.json({ data: { portfolios } })
})

export default app
```

**Key transformation rules**:
1. `NextRequest` → `Context` (Hono's `c` object)
2. `NextResponse.json(data, { status })` → `c.json(data, status)`
3. `request.nextUrl.searchParams` → `c.req.query('param')`
4. `request.cookies.get('x')` → `getCookie(c, 'x')` (Hono helper)
5. `requireAuth(request)` → auth middleware sets `c.set('userId', ...)`
6. `request.json()` → `c.req.json()` (with Zod validation)

#### Phase 3 — Wire Services (Shared Code)

The services layer (`src/services/`) is already framework-agnostic. Strategy:

- **DO NOT copy services** into `backend/src/`. Use TypeScript path aliases to reference them.
- `backend/tsconfig.json` extends root config and adds `"@/services/*": ["../src/services/*"]`
- Same for `@/types/*`, `@/lib/db/*`, `@/lib/api/*`, `@/lib/calculations/*`
- Prisma client singleton (`src/lib/db/prisma.ts`) is shared between frontend tooling and backend.

#### Phase 4 — Remove Legacy

After all routes are migrated and verified:
1. Delete `backend/next-api-legacy/`
2. Delete `src/app/api/` stubs (if any remain)
3. Update frontend API base URL to point to the standalone backend

### 1.4 Migration Priority Order

1. **auth** (4 routes) — Foundation: login/logout/register/me
2. **portfolios** (4 routes) — Core CRUD, validates auth flow end-to-end
3. **transactions** (4 routes) — Depends on auth + portfolio
4. **holdings** (1 route) — Depends on portfolio
5. **stocks** (3 routes) — No auth, validates public route pattern
6. **indicators** (10 routes) — Largest domain, no auth, validates query param handling
7. **news** (4 routes) — Tests external API integration pattern
8. **risk-assessment** (3 routes) — Depends on indicators + news services
9. **holding-advice** (2 routes) — Depends on risk-assessment
10. **realized-pl** (2 routes) — Depends on transactions
11. **strategies** (3 routes) — Auth + complex JSON body
12. **dashboard** (1 route) — Simple GET
13. **sync** (1 route) — Background job trigger
14. **query-tsm** (1 route) — Utility

---

## 2. Framework Recommendation: Hono

### Recommendation: **Hono** over Express

| Criteria | Hono | Express |
|---|---|---|
| **TypeScript DX** | First-class TS, typed context/routes, generics | Needs `@types/express`, weaker inference |
| **Performance** | Fastest Node.js framework (near-native speed) | Adequate but 3-5× slower in benchmarks |
| **Bundle size** | ~14KB, zero dependencies | ~200KB + middleware packages |
| **API surface** | Modern: `c.json()`, `c.text()`, `c.html()` | Legacy: `res.json()`, manual status codes |
| **Middleware** | Built-in CORS, JWT, cookie, validator, logger | Requires `cors`, `cookie-parser`, `helmet`, etc. |
| **Validation** | `@hono/zod-validator` built-in integration | Manual or `express-validator` |
| **Cookie handling** | Built-in `getCookie`/`setCookie` helpers | Needs `cookie-parser` middleware |
| **Web Standards** | Uses `Request`/`Response` (Web API) | Express-specific `req`/`res` objects |
| **Deployment** | Runs on Node, Bun, Deno, Cloudflare Workers | Node-only (without adapters) |
| **Community** | 25k+ GitHub stars, very active, Cloudflare-backed | Massive ecosystem but stagnating |
| **Learning curve** | Low (Express-like syntax, modern patterns) | Very low (ubiquitous knowledge) |

### Rationale Specific to This Codebase

1. **Web Standards alignment**: The legacy handlers already use `NextRequest`/`NextResponse` which are Web API wrappers. Hono uses the same `Request`/`Response` Web API, making the migration more natural than converting to Express's proprietary `req`/`res` objects.

2. **Cookie-based auth**: Hono has built-in cookie helpers (`getCookie`, `setCookie`) that directly replace `request.cookies.get()` and `response.cookies.set()` from Next.js. Express requires `cookie-parser`.

3. **Zod validation path**: The codebase currently does inline validation (`if (!field)`). Hono's `@hono/zod-validator` middleware lets us incrementally adopt schema validation without a separate library integration.

4. **Typed middleware context**: Hono's `c.set('userId', id)` / `c.get('userId')` is type-safe via generics. This directly replaces the current pattern of passing user data through request headers (`x-user-id`), which is fragile.

5. **Decimal.js compatibility**: Both frameworks work with Decimal.js equally, but Hono's JSON serialization is slightly more configurable.

6. **Future flexibility**: If the system needs edge deployment (e.g., Cloudflare Workers for API proxying), Hono runs there natively.

### Recommended Hono Packages

```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/node-server": "^1.x",
    "@hono/zod-validator": "^0.4.x",
    "zod": "^3.x"
  }
}
```

---

## 3. CORS / Auth / Session Strategy

### 3.1 Deployment Topology

```
┌──────────────────┐    HTTP     ┌──────────────────┐
│  Vite SPA        │ ────────── │  Hono API Server  │
│  (port 3000)     │   CORS     │  (port 4000)      │
│  Static files    │            │  /api/v1/*        │
└──────────────────┘            └───────┬──────────┘
                                        │
                                  ┌─────┴──────┐
                                  │ PostgreSQL  │
                                  └────────────┘
```

**Development**: SPA on `:3000`, API on `:4000`, Vite proxy or CORS
**Production**: Same-origin reverse proxy (nginx/Caddy) OR separate origins with CORS

### 3.2 CORS Configuration

```typescript
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',           // Dev SPA
    'http://192.168.x.x:3000',        // LAN access (existing pattern)
    process.env.FRONTEND_URL,          // Production
  ].filter(Boolean) as string[],
  credentials: true,                    // Required for cookie auth
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,                        // Preflight cache: 24h
}))
```

**Key**: `credentials: true` is **mandatory** because we use httpOnly cookies. The browser will not send cookies cross-origin without this.

### 3.3 Authentication Strategy: Cookie-Based Sessions (Keep Current)

**Decision**: Keep the existing cookie-based session mechanism. Do NOT switch to JWT Bearer tokens.

**Rationale**:
- The codebase already has a working `Session` model in Prisma with server-side session storage
- Cookie sessions are more secure for browser-based SPAs (httpOnly, no localStorage)
- The `AuthService.validateSession()` already handles session lookup + expiry
- JWT would require building refresh token infrastructure from scratch

**Cookie configuration for cross-origin SPA**:

```typescript
setCookie(c, 'session_token', session.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // Fix the current hardcoded `false`
  sameSite: 'Lax',      // 'Lax' works for same-site; use 'None' only if truly cross-site
  path: '/',
  maxAge: 30 * 24 * 60 * 60,  // 30 days (matches SESSION_EXPIRY_DAYS)
  domain: process.env.COOKIE_DOMAIN,  // Optional: set for shared subdomain
})
```

### 3.4 Auth Middleware (Hono Version)

```typescript
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { AuthService } from '@/services/auth.service'

type AuthEnv = {
  Variables: {
    userId: string
    userEmail: string
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionToken = getCookie(c, 'session_token')

  if (!sessionToken) {
    return c.json({
      error: { code: 'UNAUTHORIZED', message: '未授權的存取' }
    }, 401)
  }

  const authService = new AuthService()
  const user = await authService.validateSession(sessionToken)

  if (!user) {
    return c.json({
      error: { code: 'SESSION_EXPIRED', message: '登入已過期，請重新登入' }
    }, 401)
  }

  c.set('userId', user.id)
  c.set('userEmail', user.email)
  await next()
})
```

**Improvements over current pattern**:
- No header injection (`x-user-id`) — uses typed context variables instead
- Proper error format matching the standardized envelope
- Environment-driven `secure` flag instead of hardcoded `false`

### 3.5 Frontend API Client Changes

The SPA currently calls relative URLs (`/api/portfolios`). After separation:

```typescript
// src/lib/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,  // Sends cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
  },
})

export default apiClient
```

**`withCredentials: true`** is critical — without it, Axios will not include cookies in cross-origin requests.

---

## 4. API Versioning, Error Format & Validation

### 4.1 API Versioning

**Strategy**: URL-prefix versioning (`/api/v1/...`)

```
/api/v1/auth/login
/api/v1/portfolios
/api/v1/portfolios/:id/holdings
/api/v1/indicators/rsi
```

**Implementation**:
```typescript
const v1 = new Hono()
v1.route('/auth', authRoutes)
v1.route('/portfolios', portfolioRoutes)
// ... all domain routes

const app = new Hono()
app.route('/api/v1', v1)
```

**Why URL prefix over headers**: Simpler to test (curl/browser), visible in logs, easy to proxy, and this project has no external API consumers that need header-based negotiation.

**Version lifecycle**: `v1` is the only version for now. When breaking changes are needed, introduce `v2` routes alongside `v1` and deprecate with `Sunset` header.

### 4.2 Standardized Error Response Format

Keep the existing `ApplicationError` + `ErrorCode` enum, but wrap in a consistent envelope:

```typescript
// Success response
{
  "data": { ... },
  "meta": {                    // Optional, for paginated/timed responses
    "timestamp": "2025-...",
    "page": 1,
    "totalPages": 5
  }
}

// Error response
{
  "error": {
    "code": "INVALID_INPUT",        // Machine-readable ErrorCode enum
    "message": "投資組合名稱不可為空白",  // Human-readable (zh-TW)
    "details": { ... }               // Optional: field errors, context
  }
}
```

**Error middleware** (replaces `handleApiError`):

```typescript
import { ErrorHandler } from 'hono'
import { ApplicationError, ErrorCode } from '@/types/errors'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('API Error:', err)

  if (err instanceof ApplicationError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      }
    }, err.statusCode as any)
  }

  // Prisma errors, validation errors, etc. (same logic as current)
  // ...

  return c.json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: '系統內部錯誤',
    }
  }, 500)
}
```

### 4.3 Validation Conventions (Zod)

Replace all inline `if (!field)` validation with Zod schemas:

```typescript
// backend/src/validators/transaction.schema.ts
import { z } from 'zod'

export const createTransactionSchema = z.object({
  portfolioId: z.string().cuid(),
  symbol: z.string().min(1).max(20),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  date: z.string().datetime(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
```

**Route usage with `@hono/zod-validator`**:

```typescript
import { zValidator } from '@hono/zod-validator'
import { createTransactionSchema } from '../validators/transaction.schema'

app.post('/',
  authMiddleware,
  zValidator('json', createTransactionSchema, (result, c) => {
    if (!result.success) {
      return c.json({
        error: {
          code: 'INVALID_INPUT',
          message: '輸入資料格式錯誤',
          details: result.error.flatten().fieldErrors,
        }
      }, 400)
    }
  }),
  async (c) => {
    const body = c.req.valid('json')
    // body is typed as CreateTransactionInput
  }
)
```

**Validation conventions**:
- One schema file per domain in `backend/src/validators/`
- Export both the schema and the inferred TypeScript type
- Query parameters use `zValidator('query', schema)`
- Path parameters use `zValidator('param', schema)`
- Custom error formatter returns `fieldErrors` in the `details` field

### 4.4 HTTP Status Code Conventions

| Situation | Status | Body |
|---|---|---|
| Success (data returned) | 200 | `{ data: ... }` |
| Resource created | 201 | `{ data: ... }` |
| No content (DELETE) | 204 | (empty) |
| Validation error | 400 | `{ error: { code: 'INVALID_INPUT', ... } }` |
| Unauthorized | 401 | `{ error: { code: 'UNAUTHORIZED', ... } }` |
| Forbidden | 403 | `{ error: { code: 'FORBIDDEN', ... } }` |
| Not found | 404 | `{ error: { code: 'PORTFOLIO_NOT_FOUND', ... } }` |
| Conflict (duplicate) | 409 | `{ error: { code: 'DUPLICATE_EMAIL', ... } }` |
| Business logic error | 422 | `{ error: { code: 'INSUFFICIENT_HOLDINGS', ... } }` |
| Rate limited | 429 | `{ error: { code: 'RATE_LIMITED', ... } }` |
| Server error | 500 | `{ error: { code: 'INTERNAL_ERROR', ... } }` |
| External API down | 503 | `{ error: { code: 'STOCK_API_ERROR', ... } }` |

---

## 5. Data-Flow Diagram

### 5.1 Request Lifecycle (Textual)

```
┌─────────────┐
│ Browser SPA  │  React components (portfolio page, dashboard, etc.)
│ (Vite build) │  Uses axios with withCredentials: true
└──────┬──────┘
       │
       │  HTTP Request (cookie: session_token=abc123)
       │  POST /api/v1/transactions
       │  Content-Type: application/json
       │  { portfolioId: "x", symbol: "2330.TW", type: "BUY", quantity: 10, price: 580 }
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Hono API Server (:4000)                       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Layer 1: Global Middleware                                      │ │
│  │  ├── CORS middleware (validates origin, sets headers)           │ │
│  │  ├── Request logger (method, path, duration)                   │ │
│  │  └── Error handler (catches unhandled errors → JSON envelope)  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Layer 2: Route-Level Middleware                                  │ │
│  │  ├── Auth middleware (reads cookie → validates session via      │ │
│  │  │   AuthService → sets c.userId/c.userEmail on context)       │ │
│  │  └── Zod validator (parses + validates body against schema →   │ │
│  │      returns 400 with field errors OR passes typed data)       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Layer 3: Route Handler (thin controller)                        │ │
│  │  ├── Extracts validated data from c.req.valid('json')          │ │
│  │  ├── Extracts userId from c.get('userId')                      │ │
│  │  ├── Converts types (string → Decimal.js, string → Date)      │ │
│  │  └── Calls service method                                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Service Layer (src/services/)                    │
│                                                                      │
│  TransactionService.createTransaction({                              │
│    portfolioId, symbol, type, quantity: Decimal, price: Decimal,     │
│    date: Date                                                        │
│  })                                                                  │
│  ├── Validates business rules (sufficient holdings for SELL)         │
│  ├── Uses Decimal.js for all financial math (no floating point)     │
│  ├── Creates TaxLot record for BUY transactions                     │
│  ├── Calculates RealizedPL for SELL (FIFO matching)                 │
│  └── Updates Holding aggregate (quantity, averageCost)               │
│                                                                      │
│  May call other services:                                            │
│  ├── StockService (external: Finnhub API for price data)            │
│  ├── IndicatorCacheService (Redis/DB cache for calculations)        │
│  └── RiskAssessmentService (composite: technical + news scoring)    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Prisma ORM + PostgreSQL                         │
│                                                                      │
│  prisma.transaction.create({                                         │
│    data: { portfolioId, symbol, type, quantity, price, date }        │
│  })                                                                  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL Tables (14 models):                                │   │
│  │  User ← Session (auth)                                        │   │
│  │  User ← Portfolio ← Holding                                   │   │
│  │  Portfolio ← Transaction ← TaxLot ← RealizedPL               │   │
│  │  Stock, StockPrice, StockNews, NewsSourceRating               │   │
│  │  IndicatorCache, CandlestickPattern, RiskAssessment           │   │
│  │  Strategy ← Backtest, StrategySignal                          │   │
│  │  HoldingAdvice, DashboardNewsItem, SyncQuotaLog               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Response Flow (reverse)                       │
│                                                                      │
│  Prisma returns typed object (with Decimal fields)                   │
│        │                                                             │
│  Service returns domain object                                       │
│        │                                                             │
│  Route handler wraps in envelope: c.json({ data: { transaction } }) │
│        │                                                             │
│  Hono serializes to JSON (Decimal → string via .toString())          │
│        │                                                             │
│  CORS headers added by middleware                                    │
│        │                                                             │
│  HTTP 201 response with Set-Cookie (if auth route)                   │
│        │                                                             │
│  Browser receives → Axios interceptor → React state update          │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Flow (Detailed)

```
Browser                     Hono API                    AuthService             PostgreSQL
  │                            │                            │                      │
  ├── POST /api/v1/auth/login ─┤                            │                      │
  │   { email, password }      │                            │                      │
  │                            ├── Zod validate body ──────►│                      │
  │                            │                            ├── findUser(email) ──►│
  │                            │                            │◄── User record ──────┤
  │                            │                            ├── bcrypt.compare() ──┤
  │                            │                            ├── createSession() ──►│
  │                            │                            │◄── Session record ───┤
  │                            │◄── { token, expiresAt } ──┤                      │
  │◄── 200 + Set-Cookie ──────┤                            │                      │
  │    session_token=abc123    │                            │                      │
  │                            │                            │                      │
  ├── GET /api/v1/portfolios ──┤                            │                      │
  │   Cookie: session_token    │                            │                      │
  │                            ├── authMiddleware ─────────►│                      │
  │                            │   getCookie('session_...')  ├── validateSession()─►│
  │                            │                            │◄── User or null ─────┤
  │                            │◄── c.set('userId', ...) ──┤                      │
  │                            ├── handler() ──────────────►│                      │
  │◄── 200 { data: [...] } ───┤                            │                      │
```

### 5.3 External API Integration Flow

```
Browser                     Hono API              StockService         Finnhub API
  │                            │                      │                    │
  ├── GET /api/v1/stocks/      │                      │                    │
  │   2330.TW/price            │                      │                    │
  │                            ├── handler() ────────►│                    │
  │                            │                      ├── checkCache() ───►(DB)
  │                            │                      │   cache miss       │
  │                            │                      ├── rateLimiter ────►│
  │                            │                      │   .acquire()       │
  │                            │                      ├── GET /quote ─────►│
  │                            │                      │◄── price data ────┤
  │                            │                      ├── updateCache() ──►(DB)
  │                            │◄── { price, ... } ──┤                    │
  │◄── 200 { data: ... } ─────┤                      │                    │
```

---

## Summary & Open Questions

### Completed Items ✅

| # | Item | Status |
|---|---|---|
| 1 | Route transformation plan (43 routes, 4 phases) | ✅ Done |
| 2 | Framework recommendation (Hono, with rationale) | ✅ Done |
| 3 | CORS/auth/session strategy (cookie-based, cross-origin) | ✅ Done |
| 4 | API versioning (`/api/v1/`), error envelope, Zod validation | ✅ Done |
| 5 | Data-flow diagram (request lifecycle, auth flow, external API) | ✅ Done |

### Open Questions for Implementation

1. **Monorepo vs separate repo?** Recommend monorepo with `backend/` directory (already partially exists). Share `src/services/`, `src/types/`, `src/lib/` via TS path aliases. Consider `npm workspaces` if dependency isolation is needed later.

2. **Development proxy**: Should the Vite dev server proxy `/api/*` to `:4000` (simpler, no CORS in dev) or use real CORS (matches production)? Recommend: CORS in dev too, to catch issues early.

3. **Session token migration**: The current `isHttpsRequest = false` hardcode in `auth/login/handler.ts` should become environment-driven (`COOKIE_SECURE=true` for production).

4. **Rate limiting**: The Finnhub rate limiter is in-process (`src/lib/api/rate-limiter.ts`). This works for single-server deployment. If scaling horizontally, consider Redis-based rate limiting.

5. **Database connection pooling**: The Prisma singleton works for moderate load. For production, consider connection pool settings in `DATABASE_URL` or PgBouncer.
