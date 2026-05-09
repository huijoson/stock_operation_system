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
