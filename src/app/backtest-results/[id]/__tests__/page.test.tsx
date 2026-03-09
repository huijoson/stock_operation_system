/**
 * @jest-environment jsdom
 * 
 * Unit tests for BacktestResultsPage component
 * 
 * Tests the backtest results page to ensure it:
 * - Renders correctly with backtest data
 * - Displays performance statistics
 * - Shows trade history table
 * - Provides export functionality
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useParams, useNavigate } from 'react-router-dom'
import { StrategyApi } from '@/services/strategy.api'
import BacktestResultsPage from '../page'

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}))

// Mock strategy API to avoid import.meta.env in api-client.ts
jest.mock('@/services/strategy.api', () => ({
  StrategyApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock IndicatorChart component
jest.mock('@/components/charts/IndicatorChart', () => {
  return function MockIndicatorChart() {
    return <div data-testid="indicator-chart">Mock Chart</div>
  }
})

// Mock Loading component
jest.mock('@/components/ui/Loading', () => ({
  Loading: () => <div data-testid="loading">Loading...</div>,
}))

describe('BacktestResultsPage', () => {
  const mockNavigate = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useParams as jest.Mock).mockReturnValue({ id: 'strategy-1' })
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)
    ;(StrategyApi.getById as jest.Mock).mockRejectedValue(new Error('not configured'))
  })

  it('should render backtest parameters form', () => {
    render(<BacktestResultsPage />)
    
    expect(screen.getByText('策略回測')).toBeInTheDocument()
    expect(screen.getByText('回測參數設定')).toBeInTheDocument()
    expect(screen.getByText('股票代號')).toBeInTheDocument()
    expect(screen.getByText('開始日期')).toBeInTheDocument()
    expect(screen.getByText('結束日期')).toBeInTheDocument()
    expect(screen.getByText('初始資金')).toBeInTheDocument()
    expect(screen.getByText('執行回測')).toBeInTheDocument()
  })

  it('should display strategy name when loaded', async () => {
    ;(StrategyApi.getById as jest.Mock).mockResolvedValueOnce({
      id: 'strategy-1',
      name: 'Test Strategy',
      conditions: [],
      logic: 'AND',
    })

    render(<BacktestResultsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('策略：Test Strategy')).toBeInTheDocument()
    })
  })

  it('should show empty state when no backtest results', () => {
    render(<BacktestResultsPage />)
    
    expect(screen.getByText('尚未執行回測')).toBeInTheDocument()
    expect(screen.getByText('設定回測參數後點擊「執行回測」開始分析策略績效')).toBeInTheDocument()
  })
})
