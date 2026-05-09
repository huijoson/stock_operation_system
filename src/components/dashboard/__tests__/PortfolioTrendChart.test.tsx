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
