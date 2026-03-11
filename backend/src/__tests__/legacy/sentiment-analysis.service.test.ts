import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';
import { PrismaClient } from '../../lib/prisma-client';

jest.mock('../../lib/prisma-client');

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      stockNews: {
        findMany: jest.fn(),
      },
    } as any;

    service = new SentimentAnalysisService(mockPrisma);
  });

  describe('analyzeSentiment', () => {
    it('應該分析正面情緒', () => {
      const result = service.analyzeSentiment(
        'Stock Surges to Record High',
        'Company beats earnings expectations with strong profit growth'
      );

      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('應該分析負面情緒', () => {
      const result = service.analyzeSentiment(
        'Stock Plunges on Earnings Miss',
        'Company reports significant loss and announces layoffs'
      );

      expect(result.label).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('應該分析中性情緒', () => {
      const result = service.analyzeSentiment(
        'Company Announces Meeting',
        'Regular quarterly board meeting scheduled'
      );

      expect(result.label).toBe('neutral');
    });
  });

  describe('getSentimentScore', () => {
    it('應該從新聞計算平均情緒分數', async () => {
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([
        {
          headline: 'Positive News',
          summary: 'Good news',
          sentimentScore: 0.6,
          sentimentLabel: 'positive',
        },
        {
          headline: 'Negative News',
          summary: 'Bad news',
          sentimentScore: -0.4,
          sentimentLabel: 'negative',
        },
      ]);

      const result = await service.getSentimentScore('AAPL');

      expect(result).not.toBeNull();
      expect(result!.averageScore).toBeCloseTo(0.1, 1);
    });

    it('應該返回 null 如果沒有新聞', async () => {
      (mockPrisma.stockNews.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSentimentScore('AAPL');

      expect(result).toBeNull();
    });
  });
});
