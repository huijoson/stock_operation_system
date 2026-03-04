import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetNewsSentiment = jest.fn();

jest.mock('@/services/dashboard-news.service', () => ({
  DashboardNewsQueryService: jest.fn().mockImplementation(() => ({
    query: mockQuery,
  })),
}));

jest.mock('@/lib/api/alpha-vantage-client', () => ({
  AlphaVantageClient: jest.fn().mockImplementation(() => ({
    getNewsSentiment: mockGetNewsSentiment,
  })),
}));

async function loadGetHandler() {
  jest.resetModules();
  const mod = await import('@/app/api/dashboard/news/route');
  return mod.GET as (req: Request) => Promise<Response>;
}

describe('GET /api/dashboard/news (T010/T011)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetNewsSentiment.mockReset();
  });

  it('defaults to latest 5 items when query params are omitted', async () => {
    mockQuery.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'n1',
            title: 'News 1',
            summary: null,
            url: 'https://example.com/1',
            source: 'Reuters',
            publishedAt: '2024-01-15T10:30:00.000Z',
            category: 'Finance',
          },
        ],
        meta: {
          total: 1,
          hasMore: false,
          nextCursor: null,
          lastSyncedAt: '2024-01-15T10:00:00.000Z',
          dataStalenessSecs: 1800,
        },
      },
    });

    const GET = await loadGetHandler();
    const req = new Request('http://localhost/api/dashboard/news');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith({ limit: 5 });
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('returns success=true with empty items when no data exists', async () => {
    mockQuery.mockResolvedValue({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: false,
          nextCursor: null,
          lastSyncedAt: null,
          dataStalenessSecs: 0,
        },
      },
    });

    const GET = await loadGetHandler();
    const req = new Request('http://localhost/api/dashboard/news');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: false,
          nextCursor: null,
          lastSyncedAt: null,
          dataStalenessSecs: 0,
        },
      },
    });
  });

  it('does not call external Alpha Vantage API client in read path', async () => {
    mockQuery.mockResolvedValue({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: false,
          nextCursor: null,
          lastSyncedAt: null,
          dataStalenessSecs: 0,
        },
      },
    });

    const GET = await loadGetHandler();
    const req = new Request('http://localhost/api/dashboard/news');
    await GET(req);

    expect(mockGetNewsSentiment).not.toHaveBeenCalled();
  });

  it('passes category, limit, and cursor query params to service', async () => {
    mockQuery.mockResolvedValue({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: true,
          nextCursor: '2024-01-15T09:00:00.000Z',
          lastSyncedAt: '2024-01-15T10:00:00.000Z',
          dataStalenessSecs: 1800,
        },
      },
    });

    const GET = await loadGetHandler();
    const req = new Request(
      'http://localhost/api/dashboard/news?category=Finance&limit=10&cursor=2024-01-15T09:00:00.000Z'
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith({
      category: 'Finance',
      limit: 10,
      cursor: '2024-01-15T09:00:00.000Z',
    });
    expect(body.data.meta.hasMore).toBe(true);
    expect(body.data.meta.nextCursor).toBe('2024-01-15T09:00:00.000Z');
  });

  it('returns 400 with unified ErrorResponse for invalid category', async () => {
    const GET = await loadGetHandler();
    const req = new Request('http://localhost/api/dashboard/news?category=Crypto');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'category 參數不合法',
      code: 'INVALID_INPUT',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
