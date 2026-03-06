/**
 * Integration tests for Fibonacci API routes
 * 
 * Tests the retracement and extension endpoints to ensure they:
 * - Accept valid parameters
 * - Validate input correctly
 * - Return properly formatted responses
 * - Handle errors appropriately
 */

import { GET as getRetracement } from '../retracement/route'
import { GET as getExtension } from '../extension/route'
import { NextRequest } from 'next/server'

describe('Fibonacci API Routes', () => {
  describe('GET /api/indicators/fibonacci/retracement', () => {
    it('should calculate retracement levels with valid parameters', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=100&low=50&isUptrend=true')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('levels')
      expect(data).toHaveProperty('high', '100')
      expect(data).toHaveProperty('low', '50')
      expect(data).toHaveProperty('direction', 'uptrend')
      expect(data.levels).toHaveLength(5) // 5 standard Fibonacci ratios
      
      // Verify all ratios are present
      const ratios = data.levels.map((l: any) => l.ratio)
      expect(ratios).toContain(0.236)
      expect(ratios).toContain(0.382)
      expect(ratios).toContain(0.5)
      expect(ratios).toContain(0.618)
      expect(ratios).toContain(0.786)
    })

    it('should default to uptrend when isUptrend is not specified', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=100&low=50')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.direction).toBe('uptrend')
    })

    it('should return 400 when high parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?low=50')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('high parameter is required')
    })

    it('should return 400 when low parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=100')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('low parameter is required')
    })

    it('should return 400 when high is not greater than low', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=50&low=100')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('high must be greater than low')
    })

    it('should return 400 when prices are not positive', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=-100&low=-50')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('must be greater than 0')
    })

    it('should return 400 when parameters are not valid numbers', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/retracement?high=abc&low=def')
      const request = new NextRequest(url)
      
      const response = await getRetracement(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('must be valid numbers')
    })
  })

  describe('GET /api/indicators/fibonacci/extension', () => {
    it('should calculate extension targets with valid parameters', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?start=100&retracement=80&breakout=90')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('targets')
      expect(data).toHaveProperty('start', '100')
      expect(data).toHaveProperty('retracement', '80')
      expect(data).toHaveProperty('breakout', '90')
      expect(data.targets).toHaveLength(3) // 3 standard extension ratios
      
      // Verify all ratios are present
      const ratios = data.targets.map((t: any) => t.ratio)
      expect(ratios).toContain(1.0)
      expect(ratios).toContain(1.618)
      expect(ratios).toContain(2.618)
    })

    it('should return 400 when start parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?retracement=80&breakout=90')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('start parameter is required')
    })

    it('should return 400 when retracement parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?start=100&breakout=90')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('retracement parameter is required')
    })

    it('should return 400 when breakout parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?start=100&retracement=80')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('breakout parameter is required')
    })

    it('should return 400 when prices are not positive', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?start=-100&retracement=-80&breakout=-90')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('must be greater than 0')
    })

    it('should return 400 when parameters are not valid numbers', async () => {
      const url = new URL('http://localhost:3000/api/indicators/fibonacci/extension?start=abc&retracement=def&breakout=ghi')
      const request = new NextRequest(url)
      
      const response = await getExtension(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('must be valid numbers')
    })
  })
})
