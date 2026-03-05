/**
 * Unit tests for DashboardNewsQueryService (Task T009).
 *
 * TDD — Red phase: these tests define the expected behaviour of `query()`,
 * then the implementation in `src/services/dashboard-news.service.ts`
 * will make them pass (Green), followed by refactoring.
 *
 * Dependencies (Prisma) are fully mocked so that the test suite runs
 * without a database.
 */

// ── Prisma mock ──────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    dashboardNewsItem: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    syncQuotaLog: {
      findFirst: jest.fn(),
    },
  },
}));

// ── Import after mocks ───────────────────────────────────────────────

import {
  DashboardNewsQueryService,
  DEFAULT_LIMIT,
  MIN_LIMIT,
  MAX_LIMIT,
} from '@/services/dashboard-news.service';
import prisma from '@/lib/db/prisma';
import type { NewsCategory } from '@/types/news.types';

// Get typed references to the mock fns
const mockPrisma = prisma as unknown as {
  dashboardNewsItem: {
    findMany: jest.Mock;
    aggregate: jest.Mock;
  };
  syncQuotaLog: {
    findFirst: jest.Mock;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────

function makeNewsItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'clxyz123',
    externalId: 'abc123def456',
    title: 'Test News Article',
    summary: 'A test summary',
    url: 'https://example.com/news/1',
    source: 'Reuters',
    publishedAt: new Date('2024-01-15T10:30:00.000Z'),
    category: 'Finance',
    rawTopics: ['finance'],
    syncedAt: new Date('2024-01-15T10:00:00.000Z'),
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('DashboardNewsQueryService', () => {
  let service: DashboardNewsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardNewsQueryService();

    // Default: no sync log found (never synced)
    mockPrisma.syncQuotaLog.findFirst.mockResolvedValue(null);
  });

  // ── Exported constants ───────────────────────────────────────────

  describe('exported constants', () => {
    it('DEFAULT_LIMIT should be 5', () => {
      expect(DEFAULT_LIMIT).toBe(5);
    });

    it('MIN_LIMIT should be 1', () => {
      expect(MIN_LIMIT).toBe(1);
    });

    it('MAX_LIMIT should be 50', () => {
      expect(MAX_LIMIT).toBe(50);
    });
  });

  // ── Default query (no params) ────────────────────────────────────

  describe('default query (no params)', () => {
    it('should return items sorted by publishedAt DESC with default limit 5', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        makeNewsItem({
          id: `item-${i}`,
          publishedAt: new Date(`2024-01-15T${String(10 - i).padStart(2, '0')}:00:00.000Z`),
        }),
      );
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({});

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(5);

      // Should request limit+1 to check hasMore
      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 6, // DEFAULT_LIMIT + 1
          orderBy: { publishedAt: 'desc' },
        }),
      );
    });

    it('should return empty items with correct meta when no data exists', async () => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.success).toBe(true);
      expect(result.data.items).toEqual([]);
      expect(result.data.meta).toEqual({
        total: 0,
        hasMore: false,
        nextCursor: null,
        lastSyncedAt: null,
        dataStalenessSecs: null,
      });
    });
  });

  describe('limit clamping (1-50)', () => {
    beforeEach(() => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);
    });

    it('should use default limit (5) when not specified', async () => {
      await service.query({});

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }), // 5 + 1
      );
    });

    it('should use provided limit when within valid range', async () => {
      await service.query({ limit: 10 });

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 11 }), // 10 + 1
      );
    });

    it('should clamp limit to MIN_LIMIT (1) when below range', async () => {
      await service.query({ limit: 0 });

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }), // 1 + 1
      );
    });

    it('should clamp limit to MIN_LIMIT (1) for negative values', async () => {
      await service.query({ limit: -5 });

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }), // 1 + 1
      );
    });

    it('should clamp limit to MAX_LIMIT (50) when above range', async () => {
      await service.query({ limit: 100 });

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 51 }), // 50 + 1
      );
    });
  });

  // ── Category filter ──────────────────────────────────────────────

  describe('category filter', () => {
    beforeEach(() => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);
    });

    it('should NOT include category in where clause when not provided', async () => {
      await service.query({});

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.where).toBeUndefined();
    });

    it('should filter by category when provided', async () => {
      await service.query({ category: 'Finance' });

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.where).toEqual(
        expect.objectContaining({ category: 'Finance' }),
      );
    });

    it('should work with each valid NewsCategory', async () => {
      const categories: NewsCategory[] = [
        'General',
        'Technology',
        'Finance',
        'Earnings',
        'Mergers',
        'Other',
      ];

      for (const category of categories) {
        jest.clearAllMocks();
        mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);
        mockPrisma.syncQuotaLog.findFirst.mockResolvedValue(null);

        await service.query({ category });

        const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
        expect(call.where).toEqual(
          expect.objectContaining({ category }),
        );
      }
    });
  });

  // ── Cursor pagination ────────────────────────────────────────────

  describe('cursor pagination', () => {
    it('should add publishedAt < cursor to where clause when cursor is provided', async () => {
      const cursorDate = '2024-01-15T10:30:00.000Z';
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({ cursor: cursorDate });

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.where).toEqual(
        expect.objectContaining({
          publishedAt: { lt: new Date(cursorDate) },
        }),
      );
    });

    it('should combine category and cursor filters', async () => {
      const cursorDate = '2024-01-15T10:30:00.000Z';
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({ category: 'Technology', cursor: cursorDate });

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.where).toEqual(
        expect.objectContaining({
          category: 'Technology',
          publishedAt: { lt: new Date(cursorDate) },
        }),
      );
    });

    it('should NOT add publishedAt filter when cursor is not provided', async () => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({});

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.where?.publishedAt).toBeUndefined();
    });
  });

  // ── publishedAt DESC sorting ─────────────────────────────────────

  describe('publishedAt DESC sorting', () => {
    it('should always sort by publishedAt DESC', async () => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({});

      expect(mockPrisma.dashboardNewsItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        }),
      );
    });
  });

  // ── hasMore / nextCursor ─────────────────────────────────────────

  describe('hasMore and nextCursor', () => {
    it('should set hasMore=true and nextCursor when more items exist', async () => {
      // Request limit=2, service fetches 3 (limit+1)
      const items = [
        makeNewsItem({
          id: 'item-1',
          publishedAt: new Date('2024-01-15T10:00:00.000Z'),
        }),
        makeNewsItem({
          id: 'item-2',
          publishedAt: new Date('2024-01-15T09:00:00.000Z'),
        }),
        makeNewsItem({
          id: 'item-3',
          publishedAt: new Date('2024-01-15T08:00:00.000Z'),
        }),
      ];
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({ limit: 2 });

      expect(result.data.items).toHaveLength(2); // Only return 2, not 3
      expect(result.data.meta.hasMore).toBe(true);
      // nextCursor = last returned item's publishedAt ISO string
      expect(result.data.meta.nextCursor).toBe('2024-01-15T09:00:00.000Z');
    });

    it('should set hasMore=false and nextCursor=null when no more items', async () => {
      const items = [
        makeNewsItem({
          id: 'item-1',
          publishedAt: new Date('2024-01-15T10:00:00.000Z'),
        }),
      ];
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({ limit: 5 });

      expect(result.data.items).toHaveLength(1);
      expect(result.data.meta.hasMore).toBe(false);
      expect(result.data.meta.nextCursor).toBeNull();
    });

    it('should set hasMore=false when items.length equals limit exactly', async () => {
      const items = [
        makeNewsItem({
          id: 'item-1',
          publishedAt: new Date('2024-01-15T10:00:00.000Z'),
        }),
        makeNewsItem({
          id: 'item-2',
          publishedAt: new Date('2024-01-15T09:00:00.000Z'),
        }),
      ];
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({ limit: 2 });

      // Fetched 2, requested limit+1=3, so length < take → no more
      expect(result.data.meta.hasMore).toBe(false);
      expect(result.data.meta.nextCursor).toBeNull();
    });
  });

  // ── Response item mapping ────────────────────────────────────────

  describe('response item mapping', () => {
    it('should map DB records to NewsItemResponse format', async () => {
      const dbItem = makeNewsItem({
        id: 'clxyz123',
        title: 'Fed Signals Rate Cuts',
        summary: 'Federal Reserve officials hinted at...',
        url: 'https://reuters.com/article/fed',
        source: 'Reuters',
        publishedAt: new Date('2024-01-15T10:30:00.000Z'),
        category: 'Finance',
      });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([dbItem]);

      const result = await service.query({});

      const item = result.data.items[0];
      expect(item).toEqual({
        id: 'clxyz123',
        title: 'Fed Signals Rate Cuts',
        summary: 'Federal Reserve officials hinted at...',
        url: 'https://reuters.com/article/fed',
        source: 'Reuters',
        publishedAt: '2024-01-15T10:30:00.000Z',
        category: 'Finance',
      });
    });

    it('should convert publishedAt Date to ISO string', async () => {
      const dbItem = makeNewsItem({
        publishedAt: new Date('2024-06-01T12:00:00.000Z'),
      });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([dbItem]);

      const result = await service.query({});

      expect(result.data.items[0].publishedAt).toBe('2024-06-01T12:00:00.000Z');
    });

    it('should handle null summary correctly', async () => {
      const dbItem = makeNewsItem({ summary: null });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([dbItem]);

      const result = await service.query({});

      expect(result.data.items[0].summary).toBeNull();
    });

    it('should not include rawTopics, externalId, syncedAt, createdAt in response', async () => {
      const dbItem = makeNewsItem();
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([dbItem]);

      const result = await service.query({});

      const item = result.data.items[0] as unknown as Record<string, unknown>;
      expect(item).not.toHaveProperty('rawTopics');
      expect(item).not.toHaveProperty('externalId');
      expect(item).not.toHaveProperty('syncedAt');
      expect(item).not.toHaveProperty('createdAt');
    });
  });

  // ── meta.total ───────────────────────────────────────────────────

  describe('meta.total', () => {
    it('should equal the number of returned items (not including overflow)', async () => {
      // 3 items fetched, limit=2 → hasMore=true, total=2
      const items = [
        makeNewsItem({ id: 'a', publishedAt: new Date('2024-01-15T10:00:00Z') }),
        makeNewsItem({ id: 'b', publishedAt: new Date('2024-01-15T09:00:00Z') }),
        makeNewsItem({ id: 'c', publishedAt: new Date('2024-01-15T08:00:00Z') }),
      ];
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({ limit: 2 });

      expect(result.data.meta.total).toBe(2);
    });

    it('should be 0 when no items exist', async () => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.data.meta.total).toBe(0);
    });
  });

  // ── lastSyncedAt and dataStalenessSecs ───────────────────────────

  describe('lastSyncedAt and dataStalenessSecs', () => {
    it('should return lastSyncedAt from SyncQuotaLog.lastSyncAt', async () => {
      const lastSyncAt = new Date('2024-01-15T10:00:00.000Z');
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue({
        id: 'log-1',
        date: '2024-01-15',
        service: 'alpha-vantage',
        callCount: 5,
        lastSyncAt,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.data.meta.lastSyncedAt).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return lastSyncedAt=null when never synced', async () => {
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue(null);
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.data.meta.lastSyncedAt).toBeNull();
    });

    it('should return lastSyncedAt=null when SyncQuotaLog exists but lastSyncAt is null', async () => {
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue({
        id: 'log-1',
        date: '2024-01-15',
        service: 'alpha-vantage',
        callCount: 1,
        lastSyncAt: null,
        lastError: 'some error',
        updatedAt: new Date(),
      });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.data.meta.lastSyncedAt).toBeNull();
    });

    it('should calculate dataStalenessSecs as seconds since lastSyncedAt', async () => {
      // Fix "now" for deterministic test
      const now = new Date('2024-01-15T10:30:00.000Z');
      jest.useFakeTimers({ now });

      const lastSyncAt = new Date('2024-01-15T10:00:00.000Z');
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue({
        id: 'log-1',
        date: '2024-01-15',
        service: 'alpha-vantage',
        callCount: 5,
        lastSyncAt,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      // 30 minutes = 1800 seconds
      expect(result.data.meta.dataStalenessSecs).toBe(1800);

      jest.useRealTimers();
    });

    it('should return dataStalenessSecs=null when lastSyncedAt is null', async () => {
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue(null);
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      const result = await service.query({});

      expect(result.data.meta.dataStalenessSecs).toBeNull();
    });

    it('should query SyncQuotaLog ordered by lastSyncAt DESC to get most recent sync', async () => {
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue(null);
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({});

      expect(mockPrisma.syncQuotaLog.findFirst).toHaveBeenCalledWith({
        where: {
          service: 'alpha-vantage',
          lastSyncAt: { not: null },
        },
        orderBy: { lastSyncAt: 'desc' },
        select: { lastSyncAt: true },
      });
    });
  });

  // ── Prisma select (only needed fields) ───────────────────────────

  describe('Prisma select optimisation', () => {
    it('should select only needed fields from DashboardNewsItem', async () => {
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue([]);

      await service.query({});

      const call = mockPrisma.dashboardNewsItem.findMany.mock.calls[0][0];
      expect(call.select).toEqual({
        id: true,
        title: true,
        summary: true,
        url: true,
        source: true,
        publishedAt: true,
        category: true,
      });
    });
  });

  // ── Full end-to-end shape ────────────────────────────────────────

  describe('full response shape', () => {
    it('should match NewsListResponse interface', async () => {
      const now = new Date('2024-01-15T10:30:00.000Z');
      jest.useFakeTimers({ now });

      const lastSyncAt = new Date('2024-01-15T10:00:00.000Z');
      mockPrisma.syncQuotaLog.findFirst.mockResolvedValue({
        id: 'log-1',
        lastSyncAt,
      });

      const items = [
        makeNewsItem({
          id: 'item-1',
          title: 'News 1',
          summary: null,
          url: 'https://example.com/1',
          source: 'Reuters',
          publishedAt: new Date('2024-01-15T10:00:00.000Z'),
          category: 'Finance',
        }),
      ];
      mockPrisma.dashboardNewsItem.findMany.mockResolvedValue(items);

      const result = await service.query({ limit: 5 });

      expect(result).toEqual({
        success: true,
        data: {
          items: [
            {
              id: 'item-1',
              title: 'News 1',
              summary: null,
              url: 'https://example.com/1',
              source: 'Reuters',
              publishedAt: '2024-01-15T10:00:00.000Z',
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

      jest.useRealTimers();
    });
  });
});
