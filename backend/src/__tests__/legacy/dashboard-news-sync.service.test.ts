/**
 * Unit tests for DashboardNewsSyncService (Task T007).
 *
 * TDD — Red phase: these tests define the expected behaviour of `run()`,
 * then the implementation in `src/services/dashboard-news-sync.service.ts`
 * will make them pass (Green), followed by refactoring.
 *
 * Dependencies (AlphaVantageClient, Prisma) are fully mocked so that the
 * test suite runs without network or database.
 */

import { createHash } from 'crypto';

// ── Prisma mock ──────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    syncQuotaLog: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dashboardNewsItem: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// ── Alpha Vantage client mock ────────────────────────────────────────

const _mockGetNewsSentiment = jest.fn();

jest.mock('@/lib/api/alpha-vantage-client', () => ({
  AlphaVantageClient: jest.fn().mockImplementation(() => ({
    getNewsSentiment: _mockGetNewsSentiment,
  })),
  AlphaVantageClientError: class AlphaVantageClientError extends Error {
    public readonly code: string;
    public readonly status?: number;
    constructor(code: string, message: string, status?: number) {
      super(message);
      this.name = 'AlphaVantageClientError';
      this.code = code;
      this.status = status;
    }
  },
}));

// ── Import after mocks ───────────────────────────────────────────────

import {
  DashboardNewsSyncService,
  generateExternalId,
  SOFT_LIMIT,
  HARD_LIMIT,
  type SyncResult,
} from '@/services/dashboard-news-sync.service';
import prisma from '@/lib/db/prisma';

// Get typed references to the mock fns
const mockPrisma = prisma as unknown as {
  syncQuotaLog: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  dashboardNewsItem: {
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
};
const mockGetNewsSentiment = _mockGetNewsSentiment;

// ── Helpers ──────────────────────────────────────────────────────────

function makeRawArticle(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Article',
    url: 'https://example.com/article-1',
    summary: 'A test summary',
    source: 'TestSource',
    timePublished: '20240115T120000',
    topics: ['technology'],
    ...overrides,
  };
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Tests ────────────────────────────────────────────────────────────

describe('DashboardNewsSyncService', () => {
  let service: DashboardNewsSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardNewsSyncService();

    // Default: $transaction executes the callback with mockPrisma
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
    );
  });

  // ── generateExternalId ───────────────────────────────────────────

  describe('generateExternalId()', () => {
    it('should produce a 32-char hex SHA-256 prefix of the URL', () => {
      const url = 'https://example.com/article-1';
      const expected = createHash('sha256').update(url).digest('hex').slice(0, 32);
      expect(generateExternalId(url)).toBe(expected);
      expect(generateExternalId(url)).toHaveLength(32);
    });

    it('should return different IDs for different URLs', () => {
      expect(generateExternalId('https://a.com')).not.toBe(
        generateExternalId('https://b.com'),
      );
    });

    it('should be deterministic (same input → same output)', () => {
      const url = 'https://example.com/stable';
      expect(generateExternalId(url)).toBe(generateExternalId(url));
    });
  });

  // ── Quota check (STEP 1) ────────────────────────────────────────

  describe('quota check', () => {
    it('should return QUOTA_EXCEEDED when callCount >= SOFT_LIMIT (20)', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 20,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });

      const result = await service.run();

      expect(result.status).toBe('QUOTA_EXCEEDED');
      expect(result.quotaUsedToday).toBe(20);
      // Should NOT call Alpha Vantage
      expect(mockGetNewsSentiment).not.toHaveBeenCalled();
    });

    it('should record zh-TW lastError in SyncQuotaLog when QUOTA_EXCEEDED (T012)', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 20,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.syncQuotaLog.update.mockResolvedValue({});

      await service.run();

      expect(mockPrisma.syncQuotaLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date_service: { date: todayUTC(), service: 'alpha-vantage' } },
          data: expect.objectContaining({
            lastError: expect.stringContaining('配額已達上限'),
          }),
        }),
      );
    });

    it('should return QUOTA_EXCEEDED when callCount >= HARD_LIMIT (24)', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 24,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });

      const result = await service.run();

      expect(result.status).toBe('QUOTA_EXCEEDED');
      expect(mockGetNewsSentiment).not.toHaveBeenCalled();
    });

    it('should proceed with sync when callCount < SOFT_LIMIT', async () => {
      // Quota check OK
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 5,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });

      mockGetNewsSentiment.mockResolvedValue([makeRawArticle()]);

      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});
      mockPrisma.syncQuotaLog.update.mockResolvedValue({});

      const result = await service.run();

      expect(result.status).toBe('SUCCESS');
      expect(mockGetNewsSentiment).toHaveBeenCalledTimes(1);
    });
  });

  // ── Fetch + Normalize (STEPS 2 & 3) ─────────────────────────────

  describe('fetch and normalize', () => {
    beforeEach(() => {
      // Quota OK
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 3,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.syncQuotaLog.update.mockResolvedValue({});
    });

    it('should normalize articles and upsert each one', async () => {
      const articles = [
        makeRawArticle({ url: 'https://a.com/1' }),
        makeRawArticle({ url: 'https://a.com/2' }),
      ];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      const result = await service.run();

      expect(result.status).toBe('SUCCESS');
      expect(result.upserted).toBe(2);
      expect(mockPrisma.dashboardNewsItem.upsert).toHaveBeenCalledTimes(2);

      // Verify first upsert call shape
      const firstCall = mockPrisma.dashboardNewsItem.upsert.mock.calls[0][0];
      expect(firstCall.where).toEqual({
        externalId: generateExternalId('https://a.com/1'),
      });
      expect(firstCall.create).toMatchObject({
        externalId: generateExternalId('https://a.com/1'),
        title: 'Test Article',
        url: 'https://a.com/1',
        source: 'TestSource',
        category: 'Technology',
      });
      // update should set syncedAt
      expect(firstCall.update).toHaveProperty('syncedAt');
    });

    it('should skip articles with empty title', async () => {
      const articles = [
        makeRawArticle({ title: '', url: 'https://a.com/empty-title' }),
        makeRawArticle({ url: 'https://a.com/valid' }),
      ];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      const result = await service.run();

      expect(result.status).toBe('SUCCESS');
      expect(result.upserted).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should skip articles with non-https URL', async () => {
      const articles = [
        makeRawArticle({ url: 'http://insecure.com' }),
        makeRawArticle({ url: 'https://secure.com' }),
      ];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      const result = await service.run();

      expect(result.upserted).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should skip articles with empty url', async () => {
      const articles = [makeRawArticle({ url: '' })];
      mockGetNewsSentiment.mockResolvedValue(articles);

      const result = await service.run();

      expect(result.skipped).toBe(1);
      expect(result.upserted).toBe(0);
    });

    it('should skip articles with invalid publishedAt (NaN date)', async () => {
      const articles = [
        makeRawArticle({ timePublished: 'not-a-date' }),
        makeRawArticle({ url: 'https://good.com', timePublished: '20240115T120000' }),
      ];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      const result = await service.run();

      expect(result.upserted).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should truncate title to 500 characters', async () => {
      const longTitle = 'A'.repeat(600);
      const articles = [makeRawArticle({ title: longTitle, url: 'https://long.com' })];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      const result = await service.run();

      expect(result.upserted).toBe(1);
      const firstCall = mockPrisma.dashboardNewsItem.upsert.mock.calls[0][0];
      expect(firstCall.create.title).toHaveLength(500);
    });

    it('should map topics to category via mapTopicsToCategory', async () => {
      const articles = [
        makeRawArticle({ topics: ['earnings'], url: 'https://a.com/earn' }),
        makeRawArticle({ topics: ['unknown_topic'], url: 'https://a.com/unknown' }),
      ];
      mockGetNewsSentiment.mockResolvedValue(articles);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      await service.run();

      const call1 = mockPrisma.dashboardNewsItem.upsert.mock.calls[0][0];
      expect(call1.create.category).toBe('Earnings');
      const call2 = mockPrisma.dashboardNewsItem.upsert.mock.calls[1][0];
      expect(call2.create.category).toBe('Other');
    });

    it('should handle empty feed gracefully', async () => {
      mockGetNewsSentiment.mockResolvedValue([]);

      const result = await service.run();

      expect(result.status).toBe('SUCCESS');
      expect(result.upserted).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  // ── Upsert + Quota update (STEPS 4 & 5) ─────────────────────────

  describe('upsert and quota update', () => {
    beforeEach(() => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 10,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.syncQuotaLog.update.mockResolvedValue({});
    });

    it('should increment callCount after successful fetch', async () => {
      mockGetNewsSentiment.mockResolvedValue([makeRawArticle()]);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      await service.run();

      // callCount should be incremented: update with increment
      expect(mockPrisma.syncQuotaLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date_service: { date: todayUTC(), service: 'alpha-vantage' } },
          data: expect.objectContaining({
            callCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should update lastSyncAt on success', async () => {
      mockGetNewsSentiment.mockResolvedValue([makeRawArticle()]);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      await service.run();

      expect(mockPrisma.syncQuotaLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastSyncAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return correct quota stats', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 7,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });

      mockGetNewsSentiment.mockResolvedValue([makeRawArticle()]);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});

      // After increment, callCount becomes 8
      mockPrisma.syncQuotaLog.update.mockResolvedValue({
        callCount: 8,
      });

      const result = await service.run();

      expect(result.status).toBe('SUCCESS');
      // quotaUsedToday = previous callCount + 1
      expect(result.quotaUsedToday).toBe(8);
      // quotaRemainingToday = SOFT_LIMIT - quotaUsedToday
      expect(result.quotaRemainingToday).toBe(12);
    });
  });

  // ── Upstream failure (STEP 2 error path) ─────────────────────────

  describe('upstream failure handling', () => {
    beforeEach(() => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 5,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });
      mockPrisma.syncQuotaLog.update.mockResolvedValue({});
    });

    it('should return UPSTREAM_UNAVAILABLE on AlphaVantageClientError', async () => {
      const { AlphaVantageClientError } = jest.requireMock(
        '@/lib/api/alpha-vantage-client',
      );
      mockGetNewsSentiment.mockRejectedValue(
        new AlphaVantageClientError('ALPHA_VANTAGE_UPSTREAM_5XX', 'Server error', 503),
      );

      const result = await service.run();

      expect(result.status).toBe('UPSTREAM_UNAVAILABLE');
    });

    it('should record lastError on upstream failure', async () => {
      const { AlphaVantageClientError } = jest.requireMock(
        '@/lib/api/alpha-vantage-client',
      );
      mockGetNewsSentiment.mockRejectedValue(
        new AlphaVantageClientError('ALPHA_VANTAGE_TIMEOUT', 'Timed out'),
      );

      await service.run();

      expect(mockPrisma.syncQuotaLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastError: expect.stringContaining('Timed out'),
          }),
        }),
      );
    });

    it('should still increment callCount on upstream failure (API was called)', async () => {
      const { AlphaVantageClientError } = jest.requireMock(
        '@/lib/api/alpha-vantage-client',
      );
      mockGetNewsSentiment.mockRejectedValue(
        new AlphaVantageClientError('ALPHA_VANTAGE_UPSTREAM_5XX', 'Error', 500),
      );

      await service.run();

      expect(mockPrisma.syncQuotaLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            callCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should NOT call upsert on upstream failure (preserve old data)', async () => {
      const { AlphaVantageClientError } = jest.requireMock(
        '@/lib/api/alpha-vantage-client',
      );
      mockGetNewsSentiment.mockRejectedValue(
        new AlphaVantageClientError(
          'ALPHA_VANTAGE_UPSTREAM_5XX',
          'Unavailable',
          503,
        ),
      );

      await service.run();

      expect(mockPrisma.dashboardNewsItem.upsert).not.toHaveBeenCalled();
    });

    it('should handle generic errors gracefully', async () => {
      mockGetNewsSentiment.mockRejectedValue(new Error('Network down'));

      const result = await service.run();

      expect(result.status).toBe('UPSTREAM_UNAVAILABLE');
      expect(mockPrisma.dashboardNewsItem.upsert).not.toHaveBeenCalled();
    });

    it('should record zh-TW lastError with raw detail on upstream failure (T012)', async () => {
      mockGetNewsSentiment.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.run();

      const updateCall = mockPrisma.syncQuotaLog.update.mock.calls[0][0];
      // lastError should contain zh-TW description AND the raw error for debugging
      expect(updateCall.data.lastError).toMatch(/上游.*不可用/);
      expect(updateCall.data.lastError).toContain('ECONNREFUSED');
    });
  });

  // ── Exported constants ───────────────────────────────────────────

  describe('exported constants', () => {
    it('SOFT_LIMIT should be 20', () => {
      expect(SOFT_LIMIT).toBe(20);
    });

    it('HARD_LIMIT should be 24', () => {
      expect(HARD_LIMIT).toBe(24);
    });
  });

  // ── Result shape ─────────────────────────────────────────────────

  describe('SyncResult shape', () => {
    it('SUCCESS result should have upserted, skipped, quotaUsedToday, quotaRemainingToday, syncedAt', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 0,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });
      mockGetNewsSentiment.mockResolvedValue([makeRawArticle()]);
      mockPrisma.dashboardNewsItem.upsert.mockResolvedValue({});
      mockPrisma.syncQuotaLog.update.mockResolvedValue({ callCount: 1 });

      const result = await service.run();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'SUCCESS',
          upserted: expect.any(Number),
          skipped: expect.any(Number),
          quotaUsedToday: expect.any(Number),
          quotaRemainingToday: expect.any(Number),
          syncedAt: expect.any(String),
        }),
      );
    });

    it('QUOTA_EXCEEDED result should have quotaUsedToday and quotaRemainingToday', async () => {
      mockPrisma.syncQuotaLog.upsert.mockResolvedValue({
        id: 'log-1',
        date: todayUTC(),
        service: 'alpha-vantage',
        callCount: 22,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(),
      });

      const result = await service.run();

      expect(result.status).toBe('QUOTA_EXCEEDED');
      expect(result.quotaUsedToday).toBe(22);
      expect(result.quotaRemainingToday).toBe(0);
    });
  });
});
