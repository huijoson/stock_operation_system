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
