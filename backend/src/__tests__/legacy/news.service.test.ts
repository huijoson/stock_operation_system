import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NewsService } from '@/services/news.service';
import { PrismaClient } from '../../lib/prisma-client';
import { FinnhubClient } from '@/lib/api/finnhub-client';

jest.mock('@/lib/api/finnhub-client');
jest.mock('../../lib/prisma-client');

describe('NewsService', () => {
  let service: NewsService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockFinnhubClient: jest.Mocked<FinnhubClient>;

  beforeEach(() => {
    mockPrisma = {
      stockNews: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      newsSourceRating: {
        findMany: jest.fn(),
      },
    } as any;

    mockFinnhubClient = {
      getCompanyNews: jest.fn(),
      getMarketNews: jest.fn(),
    } as any;

    service = new NewsService(mockPrisma, mockFinnhubClient);
  });

  describe('getNews', () => {
    it('應該從快取取得新聞如果尚未過期', async () => {
      const cachedNews = [
        {
          id: 'news-1',
          symbol: 'AAPL',
          externalId: '123456',
          headline: 'Cached News',
          summary: 'This is cached',
          url: 'https://example.com/news/1',
          imageUrl: null,
          source: 'Reuters',
          publishedAt: new Date('2024-01-01'),
          credibility: 'mainstream',
          sentimentScore: 0.5,
          sentimentLabel: 'positive',
          sentimentConfidence: 'medium',
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分鐘後過期
          createdAt: new Date(),
        },
      ];

      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue(cachedNews);

      const news = await service.getNews('AAPL');

      expect(news).toHaveLength(1);
      expect(news[0].headline).toBe('Cached News');
      expect(mockFinnhubClient.getCompanyNews).not.toHaveBeenCalled();
    });

    it('應該從 Finnhub 取得新聞如果快取過期', async () => {
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([]);

      const finnhubNews = [
        {
          id: 789012,
          datetime: Math.floor(Date.now() / 1000),
          headline: 'Fresh News',
          summary: 'This is fresh from Finnhub',
          url: 'https://example.com/news/2',
          image: 'https://example.com/image.jpg',
          source: 'Bloomberg',
          category: 'company news',
          related: 'AAPL',
        },
      ];

      (mockFinnhubClient.getCompanyNews as jest.Mock).mockResolvedValue(finnhubNews);
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([
        { sourceName: 'Bloomberg', credibilityLevel: 'mainstream' },
      ]);
      (mockPrisma.stockNews.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'news-2',
          symbol: 'AAPL',
          externalId: '789012',
          headline: 'Fresh News',
          summary: 'This is fresh from Finnhub',
          url: 'https://example.com/news/2',
          imageUrl: 'https://example.com/image.jpg',
          source: 'Bloomberg',
          publishedAt: new Date(),
          credibility: 'mainstream',
          sentimentScore: 0.0,
          sentimentLabel: 'neutral',
          sentimentConfidence: 'low',
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        },
      ]);

      const news = await service.getNews('AAPL');

      expect(mockFinnhubClient.getCompanyNews).toHaveBeenCalledWith('AAPL');
      expect(news).toHaveLength(1);
      expect(news[0].headline).toBe('Fresh News');
    });

    it('應該正確分類新聞來源可信度', async () => {
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([]);

      const finnhubNews = [
        {
          id: 111,
          datetime: Math.floor(Date.now() / 1000),
          headline: 'Official News',
          summary: 'From SEC',
          url: 'https://sec.gov/news/1',
          image: '',
          source: 'SEC',
          category: 'company news',
          related: 'AAPL',
        },
        {
          id: 222,
          datetime: Math.floor(Date.now() / 1000),
          headline: 'Unknown Source',
          summary: 'From unknown blog',
          url: 'https://blog.example.com/news/2',
          image: '',
          source: 'Unknown Blog',
          category: 'company news',
          related: 'AAPL',
        },
      ];

      (mockFinnhubClient.getCompanyNews as jest.Mock).mockResolvedValue(finnhubNews);
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([
        { sourceName: 'SEC', credibilityLevel: 'official' },
      ]);
      (mockPrisma.stockNews.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'news-3',
          symbol: 'AAPL',
          externalId: '111',
          headline: 'Official News',
          summary: 'From SEC',
          url: 'https://sec.gov/news/1',
          imageUrl: '',
          source: 'SEC',
          publishedAt: new Date(),
          credibility: 'official',
          sentimentScore: 0.0,
          sentimentLabel: 'neutral',
          sentimentConfidence: 'low',
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          id: 'news-4',
          symbol: 'AAPL',
          externalId: '222',
          headline: 'Unknown Source',
          summary: 'From unknown blog',
          url: 'https://blog.example.com/news/2',
          imageUrl: '',
          source: 'Unknown Blog',
          publishedAt: new Date(),
          credibility: 'unverified',
          sentimentScore: 0.0,
          sentimentLabel: 'neutral',
          sentimentConfidence: 'low',
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        },
      ]);

      const news = await service.getNews('AAPL');

      expect(news[0].credibility).toBe('official');
      expect(news[1].credibility).toBe('unverified');
    });
  });

  describe('getNewsForPortfolio', () => {
    it('應該取得多檔持股的新聞', async () => {
      (mockPrisma.stockNews.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'news-1',
            symbol: 'AAPL',
            externalId: '123',
            headline: 'AAPL News',
            summary: 'About AAPL',
            url: 'https://example.com/aapl',
            imageUrl: null,
            source: 'Reuters',
            publishedAt: new Date(),
            credibility: 'mainstream',
            sentimentScore: 0.5,
            sentimentLabel: 'positive',
            sentimentConfidence: 'medium',
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'news-2',
            symbol: 'MSFT',
            externalId: '456',
            headline: 'MSFT News',
            summary: 'About MSFT',
            url: 'https://example.com/msft',
            imageUrl: null,
            source: 'Bloomberg',
            publishedAt: new Date(),
            credibility: 'mainstream',
            sentimentScore: 0.3,
            sentimentLabel: 'positive',
            sentimentConfidence: 'medium',
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          },
        ]);

      const newsMap = await service.getNewsForPortfolio(['AAPL', 'MSFT']);

      expect(newsMap.AAPL).toHaveLength(1);
      expect(newsMap.MSFT).toHaveLength(1);
      expect(newsMap.AAPL[0].headline).toBe('AAPL News');
      expect(newsMap.MSFT[0].headline).toBe('MSFT News');
    });
  });
});
