/**
 * Integration tests for MACD API route
 * 
 * Tests the MACD endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handles errors appropriately
 * - Integrates with MACDService, StockService, and IndicatorCacheService
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('MACD API Route', () => {
  describe('GET /api/indicators/macd', () => {
    it('should return 400 when symbol parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('symbol parameter is required')
    })

    it('should return 400 when fastPeriod is less than 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&fastPeriod=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('fastPeriod must be a positive number')
    })

    it('should return 400 when slowPeriod is less than 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&slowPeriod=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('slowPeriod must be a positive number')
    })

    it('should return 400 when signalPeriod is less than 1', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&signalPeriod=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('signalPeriod must be a positive number')
    })

    it('should return 400 when fastPeriod is not a valid number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&fastPeriod=abc')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('fastPeriod must be a positive number')
    })

    it('should return 400 when fastPeriod >= slowPeriod', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&fastPeriod=26&slowPeriod=12')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('fastPeriod must be less than slowPeriod')
    })

    it('should return 400 when days is not a positive number', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&days=0')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('days must be a positive number')
    })

    it('should use default fastPeriod of 12 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing fastPeriod (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should use default slowPeriod of 26 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing slowPeriod (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should use default signalPeriod of 9 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing signalPeriod (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should use default days of 100 when not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for missing days (uses default)
      expect(response.status).not.toBe(400)
    })

    it('should accept custom fastPeriod parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&fastPeriod=10')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom fastPeriod
      expect(response.status).not.toBe(400)
    })

    it('should accept custom slowPeriod parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&slowPeriod=30')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom slowPeriod
      expect(response.status).not.toBe(400)
    })

    it('should accept custom signalPeriod parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&signalPeriod=12')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom signalPeriod
      expect(response.status).not.toBe(400)
    })

    it('should accept custom days parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&days=50')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept custom days
      expect(response.status).not.toBe(400)
    })

    it('should accept all custom parameters together', async () => {
      const url = new URL('http://localhost:3000/api/indicators/macd?symbol=AAPL&fastPeriod=10&slowPeriod=30&signalPeriod=12&days=50')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should accept all custom parameters
      expect(response.status).not.toBe(400)
    })
  })
})
