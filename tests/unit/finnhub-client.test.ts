import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FinnhubClient } from '@/lib/api/finnhub-client';

global.fetch = jest.fn();

describe('FinnhubClient', () => {
  let client: FinnhubClient;

  beforeEach(() => {
    client = new FinnhubClient('test_api_key');
    jest.clearAllMocks();
  });

  describe('getCompanyNews', () => {
    it('應該成功取得公司新聞', async () => {
      const mockNews = [
        {
          category: 'company news',
          datetime: 1633017600,
          headline: 'Apple Announces New Product',
          id: 123456,
          image: 'https://example.com/image.jpg',
          related: 'AAPL',
          source: 'Reuters',
          summary: 'Apple announced a new product today.',
          url: 'https://example.com/news/123456',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNews,
      });

      const news = await client.getCompanyNews('AAPL');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://finnhub.io/api/v1/company-news'),
        expect.objectContaining({
          headers: {
            'X-Finnhub-Token': 'test_api_key',
          },
        })
      );
      expect(news).toHaveLength(1);
      expect(news[0].headline).toBe('Apple Announces New Product');
    });

    it('應該在 API 失敗時拋出錯誤', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getCompanyNews('AAPL')).rejects.toThrow();
    });

    it('應該處理速率限制錯誤', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (header: string) => (header === 'Retry-After' ? '60' : null),
        },
      });

      await expect(client.getCompanyNews('AAPL')).rejects.toThrow('速率限制');
    });
  });

  describe('getMarketNews', () => {
    it('應該成功取得市場新聞', async () => {
      const mockNews = [
        {
          category: 'general',
          datetime: 1633017600,
          headline: 'Market Rally Continues',
          id: 789012,
          image: 'https://example.com/market.jpg',
          related: '',
          source: 'Bloomberg',
          summary: 'The market continues its rally.',
          url: 'https://example.com/news/789012',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNews,
      });

      const news = await client.getMarketNews('general');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://finnhub.io/api/v1/news'),
        expect.any(Object)
      );
      expect(news).toHaveLength(1);
      expect(news[0].headline).toBe('Market Rally Continues');
    });
  });
});
