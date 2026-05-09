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

  it('aggregates trend points by UTC calendar day', () => {
    const result = buildPortfolioTrendData(holdings, {
      TSM: [
        { date: '2026-05-01T16:00:00.000Z', price: new Decimal(600) },
        { date: '2026-05-02T00:00:00.000Z', price: new Decimal(610) },
      ],
      NVDA: [
        { date: '2026-05-01T23:59:59.999Z', price: new Decimal(200) },
        { date: '2026-05-02T00:00:00.000Z', price: new Decimal(210) },
      ],
    })

    expect(result).toEqual([
      { date: '2026/05/01', value: 7000 },
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

