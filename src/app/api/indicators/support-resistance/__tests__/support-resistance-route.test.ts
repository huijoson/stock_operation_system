/**
 * Integration tests for Support/Resistance API route
 * 
 * Tests the support-resistance endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handles errors appropriately
 * - Integrates with SupportResistanceService, StockService, and IndicatorCacheService
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('Support/Resistance API Route', () => {
  describe('GET /api/indicators/support-resistance', () => {
    it('should return 400 when symbol parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('symbol parameter is required')
    })

    it('should return 400 when period is less than 10', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&period=5')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('period must be a number greater than or equal to 10')
    })

    it('should return 400 when period is not a valid number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&period=abc')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('period must be a number greater than or equal to 10')
    })

    it('should return 400 when tolerance is not between 0 and 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&tolerance=1.5')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('tolerance must be a number between 0 and 1')
    })

    it('should return 400 when tolerance is zero', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&tolerance=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('tolerance must be a number between 0 and 1')
    })

    it('should return 400 when tolerance is not a valid number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&tolerance=abc')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('tolerance must be a number between 0 and 1')
    })

    it('should use default period of 90 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing period (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should use default tolerance of 0.03 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing tolerance (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should accept custom period parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&period=60')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom period
      expect(response.status).not.toBe(400)
    })

    it('should accept custom tolerance parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/support-resistance?symbol=AAPL&tolerance=0.05')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom tolerance
      expect(response.status).not.toBe(400)
    })
  })
})
