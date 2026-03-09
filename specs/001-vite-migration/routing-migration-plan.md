# Routing & Rendering Migration Plan: Next.js → React Router SPA

**Feature Branch**: `001-vite-migration`  
**Created**: 2025-07-17  
**Relates to**: [spec.md](./spec.md) — FR-004 through FR-008  
**Status**: Complete (routing already migrated; this document is the reference plan)

---

## 1. Route Mapping: Next.js File-System → react-router-dom Route Tree

### 1.1 Completed Route Map

The migration from Next.js file-system routing to `react-router-dom` `RouteObject[]` is **already in place** in `src/routes.tsx`. Below is the authoritative mapping:

| Next.js File Path | SPA Route Path | Component Import | Route Type |
|---|---|---|---|
| `src/app/page.tsx` | `/` | `HomePage` | Static / Public |
| `src/app/(auth)/login/page.tsx` | `/login` | `LoginPage` | Static / Public |
| `src/app/(auth)/register/page.tsx` | `/register` | `RegisterPage` | Static / Public |
| `src/app/dashboard/page.tsx` | `/dashboard` | `DashboardPage` | Static / Protected |
| `src/app/portfolios/page.tsx` | `/portfolios` | `PortfolioListPage` | Static / Protected |
| `src/app/portfolios/[id]/page.tsx` | `/portfolios/:id` | `PortfolioDetailPage` | Dynamic / Semi-Protected |
| `src/app/portfolios/[id]/holdings/[symbol]/page.tsx` | `/portfolios/:id/holdings/:symbol` | `HoldingDetailPage` | Dynamic / Semi-Protected |
| `src/app/transactions/[portfolioId]/page.tsx` | `/transactions/:portfolioId` | `TransactionListPage` | Dynamic / Protected |
| `src/app/technical-analysis/page.tsx` | `/technical-analysis` | `TechnicalAnalysisPage` | Static / Unguarded |
| `src/app/strategy-builder/page.tsx` | `/strategy-builder` | `StrategyBuilderPage` | Static / Unguarded |
| `src/app/fibonacci-tool/page.tsx` | `/fibonacci-tool` | `FibonacciToolPage` | Static / Unguarded |
| `src/app/backtest-results/[id]/page.tsx` | `/backtest-results/:id` | `BacktestResultsPage` | Dynamic / Unguarded |

### 1.2 Next.js Constructs Removed / Replaced

| Next.js Construct | Replacement | Location |
|---|---|---|
| `src/app/layout.tsx` (RootLayout with `children`) | `src/layouts/RootLayout.tsx` using `<Outlet />` | Root route `element` |
| `src/app/(auth)/layout.tsx` (route group) | Flattened — `/login` and `/register` are direct children of root | `src/routes.tsx` |
| `src/app/loading.tsx` (Suspense boundary) | Per-page `useState(loading)` + `<Loading />` component | Each page component |
| `[id]`, `[symbol]`, `[portfolioId]` folders | `:id`, `:symbol`, `:portfolioId` params in route path | `src/routes.tsx` |
| `generateMetadata` / `metadata` export | Not used (none existed); see §4 for CSR guidance | N/A |
| `error.tsx` / `not-found.tsx` | `<ErrorBoundary>` wrapper + catch-all `*` route (to be added) | `src/layouts/RootLayout.tsx` |

### 1.3 Target Route Tree (Final State)

```tsx
// src/routes.tsx — current + recommended additions marked with ✅ NEW
import { RouteObject } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'

// Recommended: add React.lazy() for code-splitting (see §3.3)
import HomePage from '@/app/page'
import DashboardPage from '@/app/dashboard/page'
import PortfolioListPage from '@/app/portfolios/page'
import PortfolioDetailPage from '@/app/portfolios/[id]/page'
import HoldingDetailPage from '@/app/portfolios/[id]/holdings/[symbol]/page'
import TransactionListPage from '@/app/transactions/[portfolioId]/page'
import StrategyBuilderPage from '@/app/strategy-builder/page'
import TechnicalAnalysisPage from '@/app/technical-analysis/page'
import FibonacciToolPage from '@/app/fibonacci-tool/page'
import BacktestResultsPage from '@/app/backtest-results/[id]/page'
import LoginPage from '@/app/(auth)/login/page'
import RegisterPage from '@/app/(auth)/register/page'
import NotFoundPage from '@/app/not-found'         // ✅ NEW

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,                    // ✅ NEW — route-level error boundary
    children: [
      // Public routes
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },

      // Protected routes (wrap with <AuthGuard> — see §3.2)
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/portfolios', element: <PortfolioListPage /> },
      { path: '/portfolios/:id', element: <PortfolioDetailPage /> },
      { path: '/portfolios/:id/holdings/:symbol', element: <HoldingDetailPage /> },
      { path: '/transactions/:portfolioId', element: <TransactionListPage /> },

      // Tool routes (public or protected per business rule)
      { path: '/strategy-builder', element: <StrategyBuilderPage /> },
      { path: '/technical-analysis', element: <TechnicalAnalysisPage /> },
      { path: '/fibonacci-tool', element: <FibonacciToolPage /> },
      { path: '/backtest-results/:id', element: <BacktestResultsPage /> },

      // Catch-all 404
      { path: '*', element: <NotFoundPage /> },     // ✅ NEW
    ],
  },
]
```

---

## 2. SSR → CSR Conversion Guidance by Page Type

### 2.1 General Principle

The project **never relied on SSR for data fetching**. All pages already fetch data client-side via `useEffect` + `fetch()`. The migration is a structural change (file-system routing → explicit route config), not a rendering-model change.

### 2.2 Per-Page-Type Guidance

#### Auth Pages (`/login`, `/register`)

| Aspect | Before (Next.js pattern) | After (SPA) | Action Required |
|---|---|---|---|
| Rendering | CSR (`'use client'`) | CSR | Remove `'use client'` directive |
| Data fetching | `fetch('/api/auth/login')` in handler | Same | None |
| Navigation | `useNavigate()` already used | Same | None |
| Form handling | Client-side `useState` | Same | None |
| Query params | `/login?registered=true` (not parsed) | Same; consider `useSearchParams()` for toast | Optional enhancement |

**Conversion effort**: Minimal — remove `'use client'` only.

#### Dashboard (`/dashboard`)

| Aspect | Before | After | Action Required |
|---|---|---|---|
| Rendering | CSR with auth gate | CSR with auth gate | None |
| Auth check | `fetch('/api/auth/me')` in `useEffect` | Same; recommend `<AuthGuard>` wrapper | Optional refactor |
| Data fetching | Multiple `fetch()` in `useEffect` | Same | None |
| Loading state | `useState(loading)` + `<Loading />` | Same | None |
| Navigation | `useNavigate()` for logout redirect | Same | None |

**Conversion effort**: Minimal — remove `'use client'`, optionally centralize auth guard.

#### Portfolio Pages (`/portfolios`, `/portfolios/:id`, `/portfolios/:id/holdings/:symbol`)

| Aspect | Before | After | Action Required |
|---|---|---|---|
| Dynamic params | `useParams()` from react-router-dom | Same | None |
| Nested routes | File-system nesting (`[id]/holdings/[symbol]`) | Flat route with compound params | Already done |
| Data deps | Fetch by `portfolioId` / `symbol` | Same | None |
| Auth | Mixed (list is protected, detail is not) | Recommend consistent `<AuthGuard>` | Recommend fix |

**Conversion effort**: None for routing. Auth consistency is a separate concern.

#### Analytics / Tool Pages (`/technical-analysis`, `/strategy-builder`, `/fibonacci-tool`, `/backtest-results/:id`)

| Aspect | Before | After | Action Required |
|---|---|---|---|
| Rendering | CSR, heavy computation | CSR | None |
| Auth | Not guarded | Same | Business decision |
| Dynamic params | `/backtest-results/:id` uses `useParams()` | Same | None |
| Bundle size | Large components loaded eagerly | Recommend `React.lazy()` | Recommended |

**Conversion effort**: None for routing. Code-splitting recommended for performance.

### 2.3 SSR Features That Do NOT Apply

The following Next.js SSR features were **never used** and require no conversion:

- `getServerSideProps` / `getStaticProps` — not present
- `generateStaticParams` — not present
- React Server Components — all pages had `'use client'`
- `generateMetadata` — not present (see §4 for mitigation)
- ISR / revalidation — not present
- `next/headers`, `next/cookies` on server — only used in API routes (separate backend concern)

---

## 3. SPA Patterns: Params, Navigation, Loading States, Error Handling

### 3.1 Route Parameters

**Current state**: All dynamic routes already use `useParams()` from `react-router-dom`.

| Route | Params | Current Code | Type Safety |
|---|---|---|---|
| `/portfolios/:id` | `id` | `const params = useParams(); const portfolioId = params.id as string;` | Cast to `string` |
| `/portfolios/:id/holdings/:symbol` | `id`, `symbol` | `useParams<{ id: string; symbol: string }>()` | Generic type ✅ |
| `/transactions/:portfolioId` | `portfolioId` | `const params = useParams(); const portfolioId = params.portfolioId as string;` | Cast to `string` |
| `/backtest-results/:id` | `id` | `const params = useParams(); const strategyId = params.id as string;` | Cast to `string` |

**Recommendation**: Standardize to typed generics across all pages:

```tsx
// Preferred pattern — use across all dynamic pages
const { id } = useParams<{ id: string }>()
```

**Param validation**: Add guard for missing params (handles direct URL access with invalid IDs):

```tsx
const { id } = useParams<{ id: string }>()
if (!id) {
  return <NotFoundPage />
}
```

### 3.2 Navigation Hooks

**Current state**: All pages use `useNavigate()` from `react-router-dom`. No `next/navigation` imports remain.

| Hook | Usage Count | Notes |
|---|---|---|
| `useNavigate()` | ~10 pages | Primary navigation method |
| `useParams()` | 4 pages | Dynamic route params |
| `<Link>` | 1 page (home) | Declarative links |
| `useSearchParams()` | 0 | Not used (query strings passed raw) |
| `useLocation()` | 0 | Not used |

**Recommended auth guard pattern** (centralize the repeated `/api/auth/me` check):

```tsx
// src/components/auth/AuthGuard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading } from '@/components/ui/Loading'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized')
        return res.json()
      })
      .then(() => setAuthed(true))
      .catch(() => {
        setAuthed(false)
        navigate('/login', { replace: true })
      })
  }, [navigate])

  if (authed === null) return <Loading fullScreen text="驗證中..." />
  if (!authed) return null
  return <>{children}</>
}
```

Usage in route config:

```tsx
{
  path: '/dashboard',
  element: <AuthGuard><DashboardPage /></AuthGuard>,
}
```

### 3.3 Loading States

**Current pattern** (per-page, no change needed):

```tsx
// Every protected/data page already does this:
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData().finally(() => setLoading(false))
}, [])

if (loading) return <Loading fullScreen text="載入中..." />
```

**Recommended enhancement — route-level Suspense** (for future code-splitting):

```tsx
// src/routes.tsx — lazy loading pattern
const DashboardPage = lazy(() => import('@/app/dashboard/page'))

// In route config, wrap with Suspense in RootLayout:
// src/layouts/RootLayout.tsx
export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ChunkErrorRecovery />
        <Suspense fallback={<Loading fullScreen text="載入中..." />}>
          <Outlet />
        </Suspense>
        <ToastProvider />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
```

### 3.4 404 / Not-Found Handling

**Current state**: No 404 handler exists. Unmatched URLs render blank inside the layout.

**Required addition** (per FR-008):

```tsx
// src/app/not-found.tsx (new file)
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-6">找不到此頁面</p>
      <Link to="/" className="text-blue-600 hover:underline">
        返回首頁
      </Link>
    </div>
  )
}
```

Register as catch-all in `src/routes.tsx`:

```tsx
{ path: '*', element: <NotFoundPage /> }
```

### 3.5 Error Boundaries

**Current state**: The app has a robust error boundary setup:

| Component | Scope | Handles |
|---|---|---|
| `ErrorBoundary` (class) | Wraps entire app in `RootLayout` | React render errors, auto-reloads on ChunkLoadError |
| `ChunkErrorRecovery` | Global event listener | `error` + `unhandledrejection` events for dynamic imports |

**Recommended addition — React Router `errorElement`**:

React Router v6.4+ supports `errorElement` on route objects, which catches errors thrown during rendering or in loaders. This complements the existing `ErrorBoundary`:

```tsx
// src/components/ui/RouteErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold mb-4">{error.status}</h1>
        <p className="text-lg text-gray-600 mb-6">{error.statusText}</p>
        <Link to="/" className="text-blue-600 hover:underline">返回首頁</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">發生錯誤</h1>
      <p className="text-lg text-gray-600 mb-6">請重新整理頁面或返回首頁</p>
      <Link to="/" className="text-blue-600 hover:underline">返回首頁</Link>
    </div>
  )
}
```

Wire into route tree:

```tsx
{
  element: <RootLayout />,
  errorElement: <RouteErrorPage />,   // catches route-level errors
  children: [...]
}
```

---

## 4. SEO & Metadata Implications After SSR Removal

### 4.1 Impact Assessment

| Factor | Impact | Severity |
|---|---|---|
| Search engine crawling | Reduced — SPA content requires JS execution | **Low** — this is an internal business app, not a public content site |
| Social sharing / OpenGraph | No dynamic OG tags without SSR | **Low** — portfolios are private, no public sharing expected |
| Page titles / descriptions | Must be set client-side | **Medium** — affects browser tab UX and bookmarks |
| Initial page load (FCP) | Slightly slower — HTML shell loads, then JS hydrates | **Low** — internal app with known users on good connections |

### 4.2 Why SEO Is Low-Risk for This Project

1. **Internal/auth-gated app**: Dashboard, portfolios, transactions are all behind login — search engines wouldn't index these anyway.
2. **No public content pages**: The only public pages are `/` (landing), `/login`, and `/register` — minimal SEO surface.
3. **No existing SEO investment**: The project has zero `generateMetadata` or `<head>` management — there is nothing to regress.

### 4.3 Practical Mitigations

#### 4.3.1 Client-Side Document Title (Recommended — implement now)

Use `react-helmet-async` or a simple custom hook for per-page titles:

```tsx
// src/hooks/useDocumentTitle.ts
import { useEffect } from 'react'

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} | 股市投資組合管理系統`
    return () => { document.title = prev }
  }, [title])
}
```

Usage in each page:

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  useDocumentTitle('儀表板')
  // ...
}
```

Page title map:

| Route | Title (zh-TW) |
|---|---|
| `/` | `首頁` |
| `/login` | `登入` |
| `/register` | `註冊` |
| `/dashboard` | `儀表板` |
| `/portfolios` | `投資組合` |
| `/portfolios/:id` | `投資組合詳情` (or dynamic portfolio name) |
| `/portfolios/:id/holdings/:symbol` | `持股詳情 — {symbol}` |
| `/transactions/:portfolioId` | `交易紀錄` |
| `/technical-analysis` | `技術分析` |
| `/strategy-builder` | `策略建構` |
| `/fibonacci-tool` | `費波那契工具` |
| `/backtest-results/:id` | `回測結果` |
| `*` (404) | `找不到頁面` |

#### 4.3.2 Static `index.html` Meta Tags (Recommended — implement now)

Set sensible defaults in `index.html` for the landing page and social sharing fallback:

```html
<!-- index.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>股市投資組合管理系統</title>
  <meta name="description" content="管理您的股票投資組合、技術分析與風險評估" />
  <meta property="og:title" content="股市投資組合管理系統" />
  <meta property="og:description" content="管理您的股票投資組合、技術分析與風險評估" />
  <meta property="og:type" content="website" />
  <meta name="robots" content="noindex, nofollow" />  <!-- Internal app -->
</head>
```

#### 4.3.3 Pre-rendering for Public Routes (Optional — future enhancement)

If SEO for `/` (landing page) ever becomes important:

- Use `vite-plugin-prerender` to generate static HTML for `/`, `/login`, `/register` at build time.
- This provides crawlable HTML without requiring SSR infrastructure.
- **Not needed now** — the app has `noindex, nofollow` as it is internal.

#### 4.3.4 Sitemap / robots.txt (Optional — if the app goes public)

```txt
# public/robots.txt
User-agent: *
Disallow: /dashboard
Disallow: /portfolios
Disallow: /transactions
Allow: /
Allow: /login
Allow: /register
```

---

## 5. Migration Checklist

### Already Complete ✅

- [x] All 12 routes defined in `src/routes.tsx` with `react-router-dom` `RouteObject[]`
- [x] `createBrowserRouter` + `RouterProvider` in `src/main.tsx`
- [x] `RootLayout` uses `<Outlet />` (not `children` prop)
- [x] All pages use `useNavigate()` from `react-router-dom`
- [x] All dynamic pages use `useParams()` from `react-router-dom`
- [x] `<Link>` from `react-router-dom` on home page
- [x] No `next/navigation` or `next/router` imports in page components
- [x] `ErrorBoundary` + `ChunkErrorRecovery` provide error recovery

### To Be Implemented 🔲

- [ ] Add catch-all `{ path: '*', element: <NotFoundPage /> }` route (FR-008)
- [ ] Create `src/app/not-found.tsx` component with Chinese UI
- [ ] Add `errorElement` to root route for React Router error handling
- [ ] Create `src/components/ui/RouteErrorPage.tsx`
- [ ] Add `useDocumentTitle` hook for client-side page titles
- [ ] Add document titles to each page component
- [ ] Update `index.html` with default meta tags and `noindex`
- [ ] Remove remaining `'use client'` directives from all 59 files (FR-009)
- [ ] Implement `React.lazy()` code-splitting for heavy pages (recommended)
- [ ] Add `<Suspense>` fallback in `RootLayout` (recommended)
- [ ] Consider centralizing auth guard as `<AuthGuard>` wrapper (recommended)

### Optional / Future Enhancements 🔮

- [ ] `react-helmet-async` for full `<head>` management (if needed)
- [ ] `vite-plugin-prerender` for static HTML on public routes (if SEO needed)
- [ ] `robots.txt` and sitemap (if app goes public)
- [ ] `useSearchParams()` for `/login?registered=true` toast message

---

## 6. File Change Summary

| File | Action | Purpose |
|---|---|---|
| `src/routes.tsx` | Edit | Add `path: '*'` catch-all, add `errorElement` |
| `src/app/not-found.tsx` | Create | 404 page component |
| `src/components/ui/RouteErrorPage.tsx` | Create | Route-level error boundary |
| `src/hooks/useDocumentTitle.ts` | Create | Client-side `<title>` management |
| `src/layouts/RootLayout.tsx` | Edit | Add `<Suspense>` wrapper around `<Outlet>` |
| `index.html` | Edit | Add default meta tags |
| All 12 page components | Edit | Add `useDocumentTitle()` calls |
| 59 files with `'use client'` | Edit | Remove directive (separate task) |
