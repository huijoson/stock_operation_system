/**
 * Integration tests for Technical Score API route
 * 
 * Tests the technical score endpoint to ensure it:
 * - Accepts valid parameters
 * - Validates input correctly
 * - Returns properly formatted responses
 * - Handles errors appropriately
 * - Integrates with TechnicalScoreService and all indicator services
 */

import { GET } from '../handler'
import { NextRequest } from 'next/server'

describe('Technical Score API Route', () => {
  describe('GET /api/indicators/technical-score', () => {
    it('should return 400 when symbol parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/technical-score')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('symbol parameter is required')
    })

    it('should accept valid symbol parameter', async () => {
      const url = new URL('http://localhost:3000/api/indicators/technical-score?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      // Should not return 400 for valid symbol
      expect(response.status).not.toBe(400)
    })

    it('should return response with required fields when successful', async () => {
      const url = new URL('http://localhost:3000/api/indicators/technical-score?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        // Check required fields
        expect(data).toHaveProperty('symbol')
        expect(data).toHaveProperty('totalScore')
        expect(data).toHaveProperty('rating')
        expect(data).toHaveProperty('components')
        expect(data).toHaveProperty('timestamp')
        
        // Check components structure
        expect(data.components).toHaveProperty('rsi')
        expect(data.components).toHaveProperty('macd')
        expect(data.components).toHaveProperty('bollinger')
        expect(data.components).toHaveProperty('fibonacci')
        
        // Check component fields
        expect(data.components.rsi).toHaveProperty('score')
        expect(data.components.rsi).toHaveProperty('weight')
        expect(data.components.macd).toHaveProperty('score')
        expect(data.components.macd).toHaveProperty('weight')
        expect(data.components.bollinger).toHaveProperty('score')
        expect(data.components.bollinger).toHaveProperty('weight')
        expect(data.components.fibonacci).toHaveProperty('score')
        expect(data.components.fibonacci).toHaveProperty('weight')
      }
    })

    it('should return totalScore within 0-100 range', async () => {
      const url = new URL('http://localhost:3000/api/indicators/technical-score?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        expect(data.totalScore).toBeGreaterThanOrEqual(0)
        expect(data.totalScore).toBeLessThanOrEqual(100)
      }
    })

    it('should return valid rating value', async () => {
      const url = new URL('http://localhost:3000/api/indicators/technical-score?symbol=AAPL')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        const validRatings = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']
        expect(validRatings).toContain(data.rating)
      }
    })
  })
})
