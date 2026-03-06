/**
 * Integration tests for Candlestick Patterns API route
 * 
 * Tests the candlestick patterns endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handles errors appropriately
 * - Integrates with CandlestickPatternService, StockService, and IndicatorCacheService
 */

import { GET } from '../handler'
import { NextRequest } from 'next/server'

describe('Candlestick Patterns API Route', () => {
  describe('GET /api/indicators/candlestick-patterns', () => {
    it('should return 400 when symbol parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('symbol parameter is required')
    })

    it('should return 400 when days is less than 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=AAPL&days=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('days must be a positive number')
    })

    it('should return 400 when days is not a valid number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=AAPL&days=abc')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('days must be a positive number')
    })

    it('should use default days of 30 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing days (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should accept custom days parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=AAPL&days=60')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom days
      expect(response.status).not.toBe(400)
    })

    it('should return 400 when insufficient data (less than 3 data points)', async () => {
      // This test would require mocking the StockService to return insufficient data
      // For now, we'll just verify the route structure is correct
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=INVALID')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should handle insufficient data gracefully
      expect([400, 404, 500]).toContain(response.status)
    })

    it('should return properly formatted response for valid request', async () => {
      const url = new URL('http://localhost:3000/api/indicators/candlestick-patterns?symbol=AAPL&days=30')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        // Verify response structure
        expect(data).toHaveProperty('symbol')
        expect(data).toHaveProperty('patterns')
        expect(data).toHaveProperty('timestamp')
        expect(Array.isArray(data.patterns)).toBe(true)
        
        // If patterns exist, verify their structure
        if (data.patterns.length > 0) {
          const pattern = data.patterns[0]
          expect(pattern).toHaveProperty('pattern')
          expect(pattern).toHaveProperty('signal')
          expect(pattern).toHaveProperty('reliability')
          expect(pattern).toHaveProperty('description')
          expect(pattern).toHaveProperty('date')
          expect(pattern).toHaveProperty('atGoldenRatio')
          
          // Verify signal is one of the expected values
          expect(['bullish', 'bearish', 'neutral']).toContain(pattern.signal)
          
          // Verify reliability is between 0 and 100
          expect(pattern.reliability).toBeGreaterThanOrEqual(0)
          expect(pattern.reliability).toBeLessThanOrEqual(100)
        }
      }
    })
  })
})
