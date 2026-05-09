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
      percentage: (row.value.toNumber() / totalValue.toNumber()) * 100,
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
  const parsedDate = new Date(date)
  const year = parsedDate.getUTCFullYear()
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getUTCDate()).padStart(2, '0')

  return `${year}/${month}/${day}`
}


