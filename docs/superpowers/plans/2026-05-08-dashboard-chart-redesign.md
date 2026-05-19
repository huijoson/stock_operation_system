# Dashboard Chart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard chart area so allocation, portfolio trend, and profit/loss distribution are readable in dark mode.

**Architecture:** Move dashboard-specific chart data preparation into pure helpers, then render three dashboard-focused chart components. Keep shared chart components untouched to avoid changing other pages, and integrate the new chart section into `src\app\dashboard\page.tsx`.

**Tech Stack:** TypeScript, React 18, Vite, Tailwind CSS, Recharts, Decimal.js, Jest, React Testing Library.

---

## File Structure

- Create: `src\lib\dashboard\chart-data.ts`
  - Pure functions for allocation, profit/loss, and portfolio trend data.
  - No React dependency.
- Create: `src\lib\dashboard\__tests__\chart-data.test.ts`
  - Unit tests for financial chart data calculations.
- Create: `src\components\dashboard\HoldingsAllocationCard.tsx`
  - Dashboard-specific donut chart plus ranked allocation list.
- Create: `src\components\dashboard\PortfolioTrendChart.tsx`
  - Dashboard-specific portfolio value line chart and empty state.
- Create: `src\components\dashboard\ProfitLossDistributionChart.tsx`
  - Dashboard-specific profit/loss bar chart plus readable value chips.
- Create: `src\components\dashboard\__tests__\HoldingsAllocationCard.test.tsx`
- Create: `src\components\dashboard\__tests__\PortfolioTrendChart.test.tsx`
- Create: `src\components\dashboard\__tests__\ProfitLossDistributionChart.test.tsx`
- Modify: `src\app\dashboard\page.tsx`
  - Fetch historical prices using existing `StockApi.getHistory`.
  - Build chart data with `src\lib\dashboard\chart-data.ts`.
  - Replace the current cramped two-card chart section with the layered chart layout.

---

### Task 1: Dashboard Chart Data Helpers

**Files:**
- Create: `src\lib\dashboard\chart-data.ts`
- Create: `src\lib\dashboard\__tests__\chart-data.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src\lib\dashboard\__tests__\chart-data.test.ts`:

```typescript
import Decimal from 'decimal.js'
import {
  buildAllocationData,
  buildPortfolioTrendData,
  buildProfitLossData,
} from '../chart-data'

const holdings = [
  {
    id: 'h1',
    portfolioId: 'p1',
    symbol: 'TSM',
    quantity: '10',
    averageCost: '500',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'h2',
    portfolioId: 'p1',
    symbol: 'NVDA',
    quantity: '5',
    averageCost: '100',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'h3',
    portfolioId: 'p1',
    symbol: 'MISSING',
    quantity: '2',
    averageCost: '50',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('dashboard chart data helpers', () => {
  it('builds sorted allocation data with market value and percentage', () => {
    const result = buildAllocationData(holdings, {
      TSM: new Decimal(600),
      NVDA: new Decimal(200),
    })

    expect(result).toEqual([
      {
        symbol: 'TSM',
        name: 'TSM',
        value: 6000,
        percentage: 85.71428571428571,
        color: '#38bdf8',
      },
      {
        symbol: 'NVDA',
        name: 'NVDA',
        value: 1000,
        percentage: 14.285714285714285,
        color: '#22c55e',
      },
    ])
  })

  it('builds profit/loss data with gain and loss colors', () => {
    const result = buildProfitLossData(holdings, {
      TSM: new Decimal(650),
      NVDA: new Decimal(80),
    })

    expect(result).toEqual([
      {
        symbol: 'TSM',
        value: 1500,
        color: '#10b981',
      },
      {
        symbol: 'NVDA',
        value: -100,
        color: '#ef4444',
      },
    ])
  })

  it('builds portfolio trend points only from available historical prices', () => {
    const result = buildPortfolioTrendData(holdings, {
      TSM: [
        { date: '2026-05-01T00:00:00.000Z', price: new Decimal(590) },
        { date: '2026-05-02T00:00:00.000Z', price: new Decimal(610) },
      ],
      NVDA: [
        { date: '2026-05-01T00:00:00.000Z', price: new Decimal(190) },
        { date: '2026-05-02T00:00:00.000Z', price: new Decimal(210) },
      ],
    })

    expect(result).toEqual([
      { date: '2026/05/01', value: 6850 },
      { date: '2026/05/02', value: 7150 },
    ])
  })

  it('does not fabricate a trend when fewer than two dates are available', () => {
    const result = buildPortfolioTrendData(holdings, {
      TSM: [{ date: '2026-05-01T00:00:00.000Z', price: new Decimal(590) }],
    })

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/chart-data.test.ts
```

Expected: FAIL because `src\lib\dashboard\chart-data.ts` does not exist.

- [ ] **Step 3: Implement the data helpers**

Create `src\lib\dashboard\chart-data.ts`:

```typescript
import Decimal from 'decimal.js'

export interface DashboardHolding {
  id: string
  portfolioId: string
  symbol: string
  quantity: string
  averageCost: string
  createdAt: string
  updatedAt: string
}

export interface HistoricalPricePoint {
  date: string
  price: Decimal
}

export interface AllocationChartDatum {
  symbol: string
  name: string
  value: number
  percentage: number
  color: string
}

export interface ProfitLossChartDatum {
  symbol: string
  value: number
  color: string
}

export interface PortfolioTrendDatum {
  date: string
  value: number
}

export const DASHBOARD_CHART_COLORS = [
  '#38bdf8',
  '#22c55e',
  '#f59e0b',
  '#fb7185',
  '#a78bfa',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#e879f9',
  '#60a5fa',
]

export function buildAllocationData(
  holdings: DashboardHolding[],
  currentPrices: Record<string, Decimal>
): AllocationChartDatum[] {
  const rows = holdings
    .filter((holding) => currentPrices[holding.symbol])
    .map((holding) => {
      const marketValue = new Decimal(holding.quantity).times(currentPrices[holding.symbol])
      return {
        symbol: holding.symbol,
        name: holding.symbol,
        value: marketValue,
      }
    })

  const totalValue = rows.reduce((sum, row) => sum.plus(row.value), new Decimal(0))

  if (totalValue.isZero()) {
    return []
  }

  return rows
    .sort((a, b) => b.value.comparedTo(a.value))
    .map((row, index) => ({
      symbol: row.symbol,
      name: row.name,
      value: row.value.toNumber(),
      percentage: row.value.div(totalValue).times(100).toNumber(),
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export function buildProfitLossData(
  holdings: DashboardHolding[],
  currentPrices: Record<string, Decimal>
): ProfitLossChartDatum[] {
  return holdings
    .filter((holding) => currentPrices[holding.symbol])
    .map((holding) => {
      const quantity = new Decimal(holding.quantity)
      const averageCost = new Decimal(holding.averageCost)
      const currentPrice = currentPrices[holding.symbol]
      const value = currentPrice.minus(averageCost).times(quantity).toNumber()

      return {
        symbol: holding.symbol,
        value,
        color: value >= 0 ? '#10b981' : '#ef4444',
      }
    })
}

export function buildPortfolioTrendData(
  holdings: DashboardHolding[],
  historyBySymbol: Record<string, HistoricalPricePoint[]>
): PortfolioTrendDatum[] {
  const valueByDate = new Map<string, Decimal>()

  for (const holding of holdings) {
    const history = historyBySymbol[holding.symbol] || []
    const quantity = new Decimal(holding.quantity)

    for (const point of history) {
      const date = formatChartDate(point.date)
      const value = quantity.times(point.price)
      valueByDate.set(date, (valueByDate.get(date) || new Decimal(0)).plus(value))
    }
  }

  if (valueByDate.size < 2) {
    return []
  }

  return Array.from(valueByDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, value]) => ({
      date,
      value: value.toNumber(),
    }))
}

function formatChartDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/chart-data.test.ts
```

Expected: PASS, 4 tests passed.

- [ ] **Step 5: Commit**

```powershell
git add src\lib\dashboard\chart-data.ts src\lib\dashboard\__tests__\chart-data.test.ts
git commit -m "feat: 新增 dashboard 圖表資料計算" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Holdings Allocation Card

**Files:**
- Create: `src\components\dashboard\HoldingsAllocationCard.tsx`
- Create: `src\components\dashboard\__tests__\HoldingsAllocationCard.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src\components\dashboard\__tests__\HoldingsAllocationCard.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HoldingsAllocationCard from '../HoldingsAllocationCard'

const data = [
  { symbol: 'TSM', name: 'TSM', value: 6000, percentage: 75, color: '#38bdf8' },
  { symbol: 'NVDA', name: 'NVDA', value: 2000, percentage: 25, color: '#22c55e' },
]

describe('HoldingsAllocationCard', () => {
  it('renders allocation rows with symbols, percentages, and market values', () => {
    render(<HoldingsAllocationCard data={data} />)

    expect(screen.getByText('持股市值佔比')).toBeInTheDocument()
    expect(screen.getByText('TSM')).toBeInTheDocument()
    expect(screen.getByText('75.00%')).toBeInTheDocument()
    expect(screen.getByText('$6,000.00')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('25.00%')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()
  })

  it('renders total market value and holding count in the donut summary', () => {
    render(<HoldingsAllocationCard data={data} />)

    expect(screen.getByText('總市值')).toBeInTheDocument()
    expect(screen.getByText('$8,000.00')).toBeInTheDocument()
    expect(screen.getByText('2 檔持股')).toBeInTheDocument()
  })

  it('renders a readable empty state when allocation data is unavailable', () => {
    render(<HoldingsAllocationCard data={[]} />)

    expect(screen.getByText('目前沒有可顯示的持股市值資料')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/HoldingsAllocationCard.test.tsx
```

Expected: FAIL because `HoldingsAllocationCard` does not exist.

- [ ] **Step 3: Implement the component**

Create `src\components\dashboard\HoldingsAllocationCard.tsx`:

```typescript
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { AllocationChartDatum } from '@/lib/dashboard/chart-data'

interface HoldingsAllocationCardProps {
  data: AllocationChartDatum[]
}

export default function HoldingsAllocationCard({ data }: HoldingsAllocationCardProps) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white">持股市值佔比</h3>
        <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-600 text-gray-300">
          目前沒有可顯示的持股市值資料
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300">Allocation</p>
        <h3 className="text-xl font-semibold text-white">持股市值佔比</h3>
        <p className="text-sm text-gray-400">用排行列表取代擁擠標籤，快速比較每檔持股權重。</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)]">
        <div className="relative h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius={82}
                outerRadius={128}
                paddingAngle={2}
                stroke="#111827"
                strokeWidth={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.symbol} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${formatCurrency(value)}`,
                  name,
                ]}
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#f9fafb',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400">總市值</span>
            <span className="mt-1 text-2xl font-bold text-white">${formatCurrency(totalValue)}</span>
            <span className="mt-1 text-xs text-gray-500">{data.length} 檔持股</span>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.symbol}
              className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-white">{item.symbol}</span>
                </div>
                <span className="text-sm font-semibold text-blue-200">
                  {item.percentage.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="mt-2 text-right text-sm text-gray-300">
                ${formatCurrency(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/HoldingsAllocationCard.test.tsx
```

Expected: PASS, 3 tests passed.

- [ ] **Step 5: Commit**

```powershell
git add src\components\dashboard\HoldingsAllocationCard.tsx src\components\dashboard\__tests__\HoldingsAllocationCard.test.tsx
git commit -m "feat: 新增 dashboard 持股配置圖表" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Portfolio Trend Line Chart

**Files:**
- Create: `src\components\dashboard\PortfolioTrendChart.tsx`
- Create: `src\components\dashboard\__tests__\PortfolioTrendChart.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src\components\dashboard\__tests__\PortfolioTrendChart.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PortfolioTrendChart from '../PortfolioTrendChart'

describe('PortfolioTrendChart', () => {
  it('renders a readable empty state when trend data is unavailable', () => {
    render(<PortfolioTrendChart data={[]} />)

    expect(screen.getByText('投資組合市值趨勢')).toBeInTheDocument()
    expect(screen.getByText('目前沒有足夠的歷史價格資料可顯示趨勢線')).toBeInTheDocument()
  })

  it('renders the trend chart when at least two points are available', () => {
    const { container } = render(
      <PortfolioTrendChart
        data={[
          { date: '2026/05/01', value: 6850 },
          { date: '2026/05/02', value: 7150 },
        ]}
      />
    )

    expect(screen.getByText('投資組合市值趨勢')).toBeInTheDocument()
    expect(screen.getByText('近 30 日')).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/PortfolioTrendChart.test.tsx
```

Expected: FAIL because `PortfolioTrendChart` does not exist.

- [ ] **Step 3: Implement the component**

Create `src\components\dashboard\PortfolioTrendChart.tsx`:

```typescript
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PortfolioTrendDatum } from '@/lib/dashboard/chart-data'

interface PortfolioTrendChartProps {
  data: PortfolioTrendDatum[]
}

export default function PortfolioTrendChart({ data }: PortfolioTrendChartProps) {
  const hasTrend = data.length >= 2

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Trend</p>
          <h3 className="text-xl font-semibold text-white">投資組合市值趨勢</h3>
          <p className="mt-1 text-sm text-gray-400">觀察整體持股市值是否穩定上升或轉弱。</p>
        </div>
        <span className="mt-3 inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 sm:mt-0">
          近 30 日
        </span>
      </div>

      {!hasTrend ? (
        <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-600 px-6 text-center text-gray-300">
          目前沒有足夠的歷史價格資料可顯示趨勢線
        </div>
      ) : (
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 8" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value: number) => `$${compactNumber(value)}`}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`$${formatCurrency(value)}`, '總市值']}
                labelStyle={{ color: '#e5e7eb' }}
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#f9fafb',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="總市值"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#86efac', stroke: '#14532d', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function compactNumber(value: number): string {
  return value.toLocaleString('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/PortfolioTrendChart.test.tsx
```

Expected: PASS, 2 tests passed.

- [ ] **Step 5: Commit**

```powershell
git add src\components\dashboard\PortfolioTrendChart.tsx src\components\dashboard\__tests__\PortfolioTrendChart.test.tsx
git commit -m "feat: 新增 dashboard 市值趨勢線圖" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Profit/Loss Distribution Chart

**Files:**
- Create: `src\components\dashboard\ProfitLossDistributionChart.tsx`
- Create: `src\components\dashboard\__tests__\ProfitLossDistributionChart.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src\components\dashboard\__tests__\ProfitLossDistributionChart.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfitLossDistributionChart from '../ProfitLossDistributionChart'

const data = [
  { symbol: 'TSM', value: 1500, color: '#10b981' },
  { symbol: 'NVDA', value: -100, color: '#ef4444' },
]

describe('ProfitLossDistributionChart', () => {
  it('renders gain and loss values with readable signed text', () => {
    render(<ProfitLossDistributionChart data={data} />)

    expect(screen.getByText('各持股損益分布')).toBeInTheDocument()
    expect(screen.getByText('TSM')).toBeInTheDocument()
    expect(screen.getByText('+$1,500.00')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('-$100.00')).toBeInTheDocument()
  })

  it('renders an empty state when profit/loss data is unavailable', () => {
    render(<ProfitLossDistributionChart data={[]} />)

    expect(screen.getByText('目前沒有可顯示的損益資料')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/ProfitLossDistributionChart.test.tsx
```

Expected: FAIL because `ProfitLossDistributionChart` does not exist.

- [ ] **Step 3: Implement the component**

Create `src\components\dashboard\ProfitLossDistributionChart.tsx`:

```typescript
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ProfitLossChartDatum } from '@/lib/dashboard/chart-data'

interface ProfitLossDistributionChartProps {
  data: ProfitLossChartDatum[]
}

export default function ProfitLossDistributionChart({ data }: ProfitLossDistributionChartProps) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white">各持股損益分布</h3>
        <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-600 text-gray-300">
          目前沒有可顯示的損益資料
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Profit / Loss</p>
        <h3 className="text-xl font-semibold text-white">各持股損益分布</h3>
        <p className="text-sm text-gray-400">正損益用綠色、負損益用紅色，搭配數值列表避免只靠顏色判讀。</p>
      </div>

      <div className="mt-6 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value: number) => `$${compactNumber(value)}`}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [formatSignedCurrency(value), '損益']}
              labelStyle={{ color: '#e5e7eb' }}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: '#f9fafb',
              }}
            />
            <Bar dataKey="value" name="損益" radius={[10, 10, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.symbol} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <div
            key={item.symbol}
            className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3"
          >
            <span className="font-semibold text-white">{item.symbol}</span>
            <span className={item.value >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
              {formatSignedCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatSignedCurrency(value: number): string {
  const absolute = Math.abs(value).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value >= 0 ? '+' : '-'}$${absolute}`
}

function compactNumber(value: number): string {
  return value.toLocaleString('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- src/components/dashboard/__tests__/ProfitLossDistributionChart.test.tsx
```

Expected: PASS, 2 tests passed.

- [ ] **Step 5: Commit**

```powershell
git add src\components\dashboard\ProfitLossDistributionChart.tsx src\components\dashboard\__tests__\ProfitLossDistributionChart.test.tsx
git commit -m "feat: 新增 dashboard 損益分布圖表" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Dashboard Integration

**Files:**
- Modify: `src\app\dashboard\page.tsx`
- Test indirectly with Task 1-4 tests and final build.

- [ ] **Step 1: Import new helpers and components**

In `src\app\dashboard\page.tsx`, replace the chart imports:

```typescript
import PieChart from '@/components/charts/PieChart'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
```

with:

```typescript
import HoldingsAllocationCard from '@/components/dashboard/HoldingsAllocationCard'
import PortfolioTrendChart from '@/components/dashboard/PortfolioTrendChart'
import ProfitLossDistributionChart from '@/components/dashboard/ProfitLossDistributionChart'
import {
  HistoricalPricePoint,
  buildAllocationData,
  buildPortfolioTrendData,
  buildProfitLossData,
} from '@/lib/dashboard/chart-data'
```

- [ ] **Step 2: Add historical price state**

Below the existing `currentPrices` state:

```typescript
const [currentPrices, setCurrentPrices] = useState<Record<string, Decimal>>({})
```

add:

```typescript
const [priceHistories, setPriceHistories] = useState<Record<string, HistoricalPricePoint[]>>({})
```

- [ ] **Step 3: Fetch 30-day historical prices without blocking dashboard load**

After `setCurrentPrices(prices)` in `fetchData`, add:

```typescript
const endDate = new Date()
const startDate = new Date()
startDate.setDate(endDate.getDate() - 30)

const histories: Record<string, HistoricalPricePoint[]> = {}

await Promise.all(
  uniqueSymbols.map(async (symbol) => {
    try {
      const historyData = await StockApi.getHistory<{
        prices: Array<{ date: string; price: string | number }>
      }>(
        symbol,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      histories[symbol] = historyData.prices.map((point) => ({
        date: point.date,
        price: new Decimal(point.price),
      }))
    } catch (err) {
      console.warn(`Failed to fetch history for ${symbol}:`, err)
    }
  })
)

setPriceHistories(histories)
```

- [ ] **Step 4: Build chart data before returning JSX**

After `handleLogout`, before `if (loading)`, add:

```typescript
const allocationData = buildAllocationData(allHoldings, currentPrices)
const profitLossData = buildProfitLossData(allHoldings, currentPrices)
const trendData = buildPortfolioTrendData(allHoldings, priceHistories)
const hasChartData = allHoldings.length > 0 && Object.keys(currentPrices).length > 0
```

- [ ] **Step 5: Replace the chart section JSX**

Replace lines 349-409 of `src\app\dashboard\page.tsx` with:

```tsx
{/* Charts Section */}
{hasChartData && (
  <div className="space-y-4 sm:space-y-6">
    <RealizedPLCard />
    <HoldingsAllocationCard data={allocationData} />
    <PortfolioTrendChart data={trendData} />
    <ProfitLossDistributionChart data={profitLossData} />
  </div>
)}
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/chart-data.test.ts src/components/dashboard/__tests__/HoldingsAllocationCard.test.tsx src/components/dashboard/__tests__/PortfolioTrendChart.test.tsx src/components/dashboard/__tests__/ProfitLossDistributionChart.test.tsx
```

Expected: PASS, all dashboard chart helper and component tests passed.

- [ ] **Step 7: Run build**

Run:

```powershell
npm run build
```

Expected: PASS with Vite production build completed.

- [ ] **Step 8: Commit**

```powershell
git add src\app\dashboard\page.tsx
git commit -m "feat: 整合 dashboard 分層圖表版面" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Manual Startup Verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Start backend on an available verification port**

Run:

```powershell
$env:PORT='3002'; npm run backend:dev
```

Expected: output includes `Backend server running on http://localhost:3002`.

- [ ] **Step 2: Start frontend**

In a second shell, run:

```powershell
npm run dev
```

Expected: Vite prints a local URL, usually `http://localhost:3000/` or the next available port.

- [ ] **Step 3: Verify backend health**

Run:

```powershell
Invoke-WebRequest -Uri http://localhost:3002/api/health -UseBasicParsing
```

Expected: HTTP 200 and response body `{"status":"ok"}`.

- [ ] **Step 4: Verify dashboard route responds**

Use the frontend port printed by Vite. If Vite printed `http://localhost:3000/`, run:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/dashboard -UseBasicParsing
```

Expected: HTTP 200 and returned HTML contains `<div id="root"></div>`.

- [ ] **Step 5: Stop verification servers**

Stop the exact PowerShell sessions or process IDs used for backend and frontend verification. Do not kill by process name.

- [ ] **Step 6: Commit only if verification required a source change**

If no files changed during manual verification, do not create a commit. If a source fix was required, commit only the relevant files:

```powershell
git add <changed-files>
git commit -m "fix: 修正 dashboard 圖表啟動問題" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final Verification

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/chart-data.test.ts src/components/dashboard/__tests__/HoldingsAllocationCard.test.tsx src/components/dashboard/__tests__/PortfolioTrendChart.test.tsx src/components/dashboard/__tests__/ProfitLossDistributionChart.test.tsx
npm run build
```

Expected:

- All focused tests pass.
- TypeScript build passes.
- Vite production build completes.

Do not claim the feature is complete until the command output confirms these results.

## Known Baseline Note

Full `npm test` currently has an unrelated existing failure in `tests\property\calculation.property.test.ts` caused by generated duplicate holdings with the same symbol and different average costs. That baseline issue is not part of this dashboard redesign plan.
