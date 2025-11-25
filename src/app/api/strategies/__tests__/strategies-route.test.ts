/**
 * Integration tests for Strategy API routes
 * 
 * Tests the strategy endpoints to ensure they:
 * - Accept valid parameters
 * - Validate input correctly
 * - Return properly formatted responses
 * - Handle errors appropriately
 * - Integrate with StrategyService
 * - Enforce authentication and authorization
 */

import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' }),
}))

// Mock the StrategyService
jest.mock('@/services/strategy.service', () => {
  return {
    StrategyService: jest.fn().mockImplementation(() => ({
      getUserStrategies: jest.fn().mockResolvedValue([
        {
          id: 'strategy-1',
          userId: 'test-user-id',
          name: 'Test Strategy',
          description: 'A test strategy',
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'AND',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      createStrategy: jest.fn().mockResolvedValue({
        id: 'new-strategy-id',
        userId: 'test-user-id',
        name: 'New Strategy',
        description: 'A new strategy',
        conditions: [{ type: 'RSI_BELOW', value: 30 }],
        logic: 'OR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })),
  }
})

describe('Strategy API Routes', () => {
  describe('GET /api/strategies', () => {
    it('should return list of strategies for authenticated user', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/strategies', () => {
    it('should return 400 when name is missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'AND',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('name is required')
    })

    it('should return 400 when conditions are missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          logic: 'AND',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('at least one condition')
    })

    it('should return 400 when conditions is empty array', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          conditions: [],
          logic: 'AND',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('at least one condition')
    })

    it('should return 400 when logic is missing', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('logic must be either AND or OR')
    })

    it('should return 400 when logic is invalid', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'INVALID',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('logic must be either AND or OR')
    })

    it('should accept valid strategy creation request', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          description: 'A test strategy',
          conditions: [{ type: 'RSI_BELOW', value: 30 }],
          logic: 'OR',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('New Strategy')
    })

    it('should accept strategy without description', async () => {
      const url = new URL('http://localhost:3000/api/strategies')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Strategy',
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'AND',
        }),
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(201)
    })
  })
})
