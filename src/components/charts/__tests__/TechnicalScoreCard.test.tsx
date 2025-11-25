/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TechnicalScoreCard, { TechnicalScoreData } from '../TechnicalScoreCard'

/**
 * Unit tests for TechnicalScoreCard component
 * 
 * Tests verify that the component renders correctly with different score levels
 * and displays all required information.
 */

describe('TechnicalScoreCard', () => {
  const mockStrongBuyScore: TechnicalScoreData = {
    totalScore: 78.5,
    rating: 'strong_buy',
    components: {
      rsi: { score: 80, weight: 0.3, contribution: 24.0 },
      macd: { score: 85, weight: 0.3, contribution: 25.5 },
      bollinger: { score: 75, weight: 0.2, contribution: 15.0 },
      fibonacci: { score: 70, weight: 0.2, contribution: 14.0 },
    },
    timestamp: new Date('2024-01-15T10:30:00'),
  }

  const mockNeutralScore: TechnicalScoreData = {
    totalScore: 50.0,
    rating: 'neutral',
    components: {
      rsi: { score: 50, weight: 0.3, contribution: 15.0 },
      macd: { score: 48, weight: 0.3, contribution: 14.4 },
      bollinger: { score: 52, weight: 0.2, contribution: 10.4 },
      fibonacci: { score: 51, weight: 0.2, contribution: 10.2 },
    },
    timestamp: new Date('2024-01-15T10:30:00'),
  }

  const mockStrongSellScore: TechnicalScoreData = {
    totalScore: 22.5,
    rating: 'strong_sell',
    components: {
      rsi: { score: 20, weight: 0.3, contribution: 6.0 },
      macd: { score: 15, weight: 0.3, contribution: 4.5 },
      bollinger: { score: 30, weight: 0.2, contribution: 6.0 },
      fibonacci: { score: 25, weight: 0.2, contribution: 5.0 },
    },
    timestamp: new Date('2024-01-15T10:30:00'),
  }

  describe('Basic Rendering', () => {
    it('should render with default title', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('綜合技術評分')).toBeInTheDocument()
    })

    it('should render with custom title', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} title="AAPL 技術評分" />)
      expect(screen.getByText('AAPL 技術評分')).toBeInTheDocument()
    })

    it('should display total score', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('79')).toBeInTheDocument() // Rounded from 78.5
    })

    it('should display rating label for strong buy', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      // Rating appears in both main display and scale guide
      expect(screen.getAllByText('強勢看多').length).toBeGreaterThan(0)
      expect(screen.getByText('多項指標顯示強勁買入訊號')).toBeInTheDocument()
    })

    it('should display rating label for neutral', () => {
      render(<TechnicalScoreCard currentScore={mockNeutralScore} />)
      // Rating appears in both main display and scale guide
      expect(screen.getAllByText('中性').length).toBeGreaterThan(0)
      expect(screen.getByText('技術面無明確方向')).toBeInTheDocument()
    })

    it('should display rating label for strong sell', () => {
      render(<TechnicalScoreCard currentScore={mockStrongSellScore} />)
      // Rating appears in both main display and scale guide
      expect(screen.getAllByText('強勢看空').length).toBeGreaterThan(0)
      expect(screen.getByText('多項指標顯示賣出訊號')).toBeInTheDocument()
    })
  })

  describe('Component Scores Display', () => {
    it('should display all component names', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('RSI')).toBeInTheDocument()
      expect(screen.getByText('MACD')).toBeInTheDocument()
      expect(screen.getByText('布林通道')).toBeInTheDocument()
      expect(screen.getByText('費波那契')).toBeInTheDocument()
    })

    it('should display component scores', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      // Check for score values in the component scores section
      expect(screen.getByText(/評分: 80/)).toBeInTheDocument()
      expect(screen.getByText(/評分: 85/)).toBeInTheDocument()
      expect(screen.getByText(/評分: 75/)).toBeInTheDocument()
      expect(screen.getByText(/評分: 70/)).toBeInTheDocument()
    })

    it('should display component weights', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      // Check for weight percentages
      expect(screen.getAllByText(/權重: 30%/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/權重: 20%/).length).toBeGreaterThan(0)
    })

    it('should display component contributions', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      // Check for contribution values
      expect(screen.getByText(/貢獻: 24.0/)).toBeInTheDocument()
      expect(screen.getByText(/貢獻: 25.5/)).toBeInTheDocument()
      expect(screen.getByText(/貢獻: 15.0/)).toBeInTheDocument()
      expect(screen.getByText(/貢獻: 14.0/)).toBeInTheDocument()
    })
  })

  describe('Score Calculation Display', () => {
    it('should display score calculation breakdown', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('評分計算')).toBeInTheDocument()
    })

    it('should show calculation formula for each component', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      // Check for calculation formulas
      expect(screen.getByText(/RSI: 80 × 30%/)).toBeInTheDocument()
      expect(screen.getByText(/MACD: 85 × 30%/)).toBeInTheDocument()
    })

    it('should display total score in calculation section', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('總分')).toBeInTheDocument()
    })
  })

  describe('Score History Chart', () => {
    const mockHistory = [
      { date: '01/01', score: 65 },
      { date: '01/02', score: 70 },
      { date: '01/03', score: 75 },
      { date: '01/04', score: 78.5 },
    ]

    it('should render history chart when history is provided', () => {
      const { container } = render(
        <TechnicalScoreCard currentScore={mockStrongBuyScore} history={mockHistory} />
      )
      expect(screen.getByText('評分變化趨勢')).toBeInTheDocument()
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should not render history chart when history is empty', () => {
      const { container } = render(
        <TechnicalScoreCard currentScore={mockStrongBuyScore} history={[]} />
      )
      expect(screen.queryByText('評分變化趨勢')).not.toBeInTheDocument()
      expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
    })

    it('should not render history chart when history is not provided', () => {
      const { container } = render(
        <TechnicalScoreCard currentScore={mockStrongBuyScore} />
      )
      expect(screen.queryByText('評分變化趨勢')).not.toBeInTheDocument()
      expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
    })
  })

  describe('Rating Scale Guide', () => {
    it('should display all rating levels', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getAllByText('強勢看多').length).toBeGreaterThan(0)
      expect(screen.getAllByText('看多').length).toBeGreaterThan(0)
      expect(screen.getAllByText('中性').length).toBeGreaterThan(0)
      expect(screen.getAllByText('看空').length).toBeGreaterThan(0)
      expect(screen.getAllByText('強勢看空').length).toBeGreaterThan(0)
    })

    it('should display score ranges for each level', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText('70-100')).toBeInTheDocument()
      expect(screen.getByText('55-70')).toBeInTheDocument()
      expect(screen.getByText('45-55')).toBeInTheDocument()
      expect(screen.getByText('30-45')).toBeInTheDocument()
      expect(screen.getByText('0-30')).toBeInTheDocument()
    })
  })

  describe('Timestamp Display', () => {
    it('should display update timestamp', () => {
      render(<TechnicalScoreCard currentScore={mockStrongBuyScore} />)
      expect(screen.getByText(/更新時間:/)).toBeInTheDocument()
    })
  })

  describe('Different Rating Levels', () => {
    it('should render buy rating correctly', () => {
      const buyScore: TechnicalScoreData = {
        ...mockStrongBuyScore,
        totalScore: 62.0,
        rating: 'buy',
      }
      render(<TechnicalScoreCard currentScore={buyScore} />)
      // Rating appears in both main display and scale guide
      expect(screen.getAllByText('看多').length).toBeGreaterThan(0)
      expect(screen.getByText('技術面偏多，可考慮買入')).toBeInTheDocument()
    })

    it('should render sell rating correctly', () => {
      const sellScore: TechnicalScoreData = {
        ...mockStrongBuyScore,
        totalScore: 38.0,
        rating: 'sell',
      }
      render(<TechnicalScoreCard currentScore={sellScore} />)
      // Rating appears in both main display and scale guide
      expect(screen.getAllByText('看空').length).toBeGreaterThan(0)
      expect(screen.getByText('技術面偏空，建議觀望')).toBeInTheDocument()
    })
  })
})
