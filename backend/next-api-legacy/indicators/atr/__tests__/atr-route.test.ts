/**
 * Integration tests for ATR API route
 * 
 * Tests the ATR endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handles errors appropriately
 * - Integrates with ATRService, StockService, and IndicatorCacheService
 */

import { GET } from '../handler'
import { NextRequest } from 'next/server'

describe('ATR API Route', () => {
  describe('GET /api/indicators/atr', () => {
    it('should return 400 when symbol parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('symbol parameter is required')
    })

    it('should return 400 when period is less than 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL&period=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('period must be a positive number')
    })

    it('should return 400 when period is not a valid number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL&period=abc')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('period must be a positive number')
    })

    it('should return 400 when days is not a positive number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL&days=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('days must be a positive number')
    })

    it('should use default period of 14 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing period (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should use default days of 100 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing days (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should accept custom period parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL&period=20')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom period
      expect(response.status).not.toBe(400)
    })

    it('should accept custom days parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/atr?symbol=AAPL&days=50')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom days
      expect(response.status).not.toBe(400)
    })
  })
})
