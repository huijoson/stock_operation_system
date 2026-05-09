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

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ProfitLossDistributionChart', () => {
  it('renders gain and loss values with readable signed text', () => {
    render(<ProfitLossDistributionChart data={data} />)

    expect(screen.getByText('各持股損益分布')).toBeInTheDocument()
    expect(screen.getAllByText('TSM').length).toBeGreaterThan(0)
    expect(screen.getByText('+$1,500.00')).toBeInTheDocument()
    expect(screen.getAllByText('NVDA').length).toBeGreaterThan(0)
    expect(screen.getByText('-$100.00')).toBeInTheDocument()
  })

  it('does not emit ResponsiveContainer size warnings during test rendering', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(<ProfitLossDistributionChart data={data} />)

    const sizeWarnings = warnSpy.mock.calls.filter(([message]) => String(message).includes('width(-1)'))
    expect(sizeWarnings).toHaveLength(0)
  })

  it('renders an empty state when profit/loss data is unavailable', () => {
    render(<ProfitLossDistributionChart data={[]} />)

    expect(screen.getByText('目前沒有可顯示的損益資料')).toBeInTheDocument()
  })
})
