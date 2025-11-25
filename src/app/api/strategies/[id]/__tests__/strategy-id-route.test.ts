/**
 * Integration tests for Strategy [id] API routes
 * 
 * Tests the individual strategy endpoints to ensure they:
 * - Accept valid parameters
 * - Validate input correctly
 * - Return properly formatted responses
 * - Handle errors appropriately
 * - Enforce ownership verification
 */

import { GET, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'

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
      updateStrategy: jest.fn().mockResolvedValue({
        id: 'strategy-1',
        userId: 'test-user-id',
        name: 'Updated Strategy',
        description: 'Updated description',
        conditions: [{ type: 'RSI_BELOW', value: 30 }],
        logic: 'OR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteStrategy: jest.fn().mockResolvedValue(undefined),
    })),
  }
})

describe('Strategy [id] API Routes', () => {
  describe('GET /api/strategies/:id', () => {
    it('should return strategy details for valid ID', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.id).toBeDefined()
      expect(data.id).toBe('strategy-1')
    })

    it('should return 404 when strategy not found', async () => {
      const url = new URL('http://localhost:3000/api/strategies/not-found')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'not-found' } })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return 403 when accessing other user strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/other-user')
      const request = new NextRequest(url)
      
      const response = await GET(request, { params: { id: 'other-user' } })
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })
  })

  describe('PUT /api/strategies/:id', () => {
    it('should update strategy with valid data', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Strategy',
          description: 'Updated description',
        }),
      })
      
      const response = await PUT(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.id).toBeDefined()
    })

    it('should return 404 when updating non-existent strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/not-found')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Strategy',
        }),
      })
      
      const response = await PUT(request, { params: { id: 'not-found' } })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return 403 when updating other user strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/other-user')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Strategy',
        }),
      })
      
      const response = await PUT(request, { params: { id: 'other-user' } })
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('should return 400 when logic is invalid', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          logic: 'INVALID',
        }),
      })
      
      const response = await PUT(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('logic must be either AND or OR')
    })

    it('should return 400 when conditions is empty array', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          conditions: [],
        }),
      })
      
      const response = await PUT(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('at least one condition')
    })
  })

  describe('DELETE /api/strategies/:id', () => {
    it('should delete strategy with valid ID', async () => {
      const url = new URL('http://localhost:3000/api/strategies/strategy-1')
      const request = new NextRequest(url, {
        method: 'DELETE',
      })
      
      const response = await DELETE(request, { params: { id: 'strategy-1' } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.message).toContain('deleted successfully')
    })

    it('should return 404 when deleting non-existent strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/not-found')
      const request = new NextRequest(url, {
        method: 'DELETE',
      })
      
      const response = await DELETE(request, { params: { id: 'not-found' } })
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return 403 when deleting other user strategy', async () => {
      const url = new URL('http://localhost:3000/api/strategies/other-user')
      const request = new NextRequest(url, {
        method: 'DELETE',
      })
      
      const response = await DELETE(request, { params: { id: 'other-user' } })
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })
  })
})
