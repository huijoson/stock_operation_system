/**
 * Integration tests for Strategy Backtest API route
 * 
 * Tests the backtest endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handle errors appropriately
 * - Enforces ownership verification
 */

import { GET } from '../handler'
import { NextRequest } from 'next/server'
import Decimal from 'decimal.js'

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' }),
}))

// Mock the StrategyService
jest.mock('@/services/strategy.service', () => {
  return {
    StrategyService: jest.fn().mockImplementation(() => ({
      getStrategy: jest.fn().mockImplementation((id: string) => {
        if (id === 'not-found') return null
        if (id === 'other-user') {
          return {
            id: 'other-user',
            userId: 'other-user-id',
            name: 'Other User Strategy',
            description: null,
            conditions: [{ type: 'RSI_ABOVE', value: 70 }],
            logic: 'AND',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
        return {
          id,
          userId: 'test-user-id',
          name: 'Test Strategy',
          description: 'A test strategy',
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'AND',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }),
      backtest: jest.fn().mockResolvedValue({
        totalTrades: 10,
        winRate: 60,
        averageReturn: new Decimal('5.5'),
        maxDrawdown: new Decimal('12.3'),
        trades: [
          {
            date: new Date('2024-01-01'),
            type: 'BUY',
            price: new Decimal('100'),
            quantity: 1,
          },
          {
            date: new Date('2024-01-05'),
            type: 'SELL',
            price: new Decimal('105'),
            quantity: 1,
            profit: new Decimal('5'),
            return: 5,
          },
        ],
      }),
    })),
  }
})

describe('Strategy Backtest API Route', () => {
  describe('GET /api/strategies/:id/backtest', () => {
    it('should return 400 when symbol is missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?startDate=2024-01-01&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Symbol is required')
    })

    it('should return 400 when startDate is missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Start date and end date are required')
    })

    it('should return 400 when endDate is missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-01-01')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Start date and end date are required')
    })

    it('should return 400 when startDate is invalid', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=invalid&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when endDate is invalid', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-01-01&endDate=invalid')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-12-31&endDate=2024-01-01')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Start date must be before end date')
    })

    it('should return 404 when strategy not found', async () => {
      const url = new URL('http://localhost:3000/api/strategies/not-found/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'not-found' } })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return 403 when accessing other user strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/other-user/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'other-user' } })
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('should execute backtest with valid parameters', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.totalTrades).toBe(10)
      expect(data.winRate).toBe(60)
      expect(typeof data.avgReturn).toBe('number')
      expect(typeof data.maxDrawdown).toBe('number')
      expect(Array.isArray(data.trades)).toBe(true)
      expect(data.strategyName).toBe('Test Strategy')
      expect(data.equityCurve).toBeDefined()
      expect(Array.isArray(data.equityCurve)).toBe(true)
    })

    it('should serialize Decimal values to numbers', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(typeof data.avgReturn).toBe('number')
      expect(typeof data.maxDrawdown).toBe('number')
      
      // Check trade serialization
      if (data.trades.length > 0) {
        const trade = data.trades[0]
        expect(typeof trade.price).toBe('number')
        if (trade.profit !== undefined) {
          expect(typeof trade.profit).toBe('number')
        }
      }
    })
  })
})
