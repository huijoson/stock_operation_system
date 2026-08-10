import { RiskAssessmentService } from '@/services/risk-assessment.service';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';
import { PrismaClient } from '../../lib/prisma-client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import Decimal from 'decimal.js';

jest.mock('@/services/sentiment-analysis.service');
jest.mock('@/services/stock.service', () => ({
  StockService: jest.fn().mockImplementation(() => ({
    getHistoricalOHLC: jest.fn().mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        open: new Decimal(150),
        high: new Decimal(155),
        low: new Decimal(145),
        close: new Decimal(150),
      }))
    ),
  })),
}));
jest.mock('@/services/technical-score.service', () => ({
  TechnicalScoreService: jest.fn().mockImplementation(() => ({
    calculateScore: jest.fn().mockReturnValue({
      totalScore: 50,
      rating: 'neutral',
      components: {
        rsi: { score: 50, weight: 0.25 },
        macd: { score: 50, weight: 0.3 },
        bollinger: { score: 50, weight: 0.25 },
        fibonacci: { score: 50, weight: 0.2 },
      },
      timestamp: new Date(),
    }),
  })),
}));

const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let sentimentService: jest.Mocked<SentimentAnalysisService>;

  beforeEach(() => {
    mockReset(prismaMock);
    sentimentService = new SentimentAnalysisService(prismaMock) as jest.Mocked<SentimentAnalysisService>;
    service = new RiskAssessmentService(prismaMock, sentimentService);
  });

  describe('getRiskAssessment', () => {
    it('should return cached assessment if not expired', async () => {
      const symbol = 'AAPL';
      const cachedAssessment = {
        id: '1',
        symbol,
        riskScore: 45,
        riskLevel: 'medium',
        technicalScore: 50,
        rsiScore: 60,
        macdScore: 50,
        bollingerScore: 40,
        fibonacciScore: 50,
        newsScore: 30,
        newsSentiment: 'negative' as const,
        newsArticleCount: 5,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.findUnique.mockResolvedValue(cachedAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(result.symbol).toBe(symbol);
      expect(result.riskScore).toBe(45);
      expect(prismaMock.riskAssessment.findUnique).toHaveBeenCalledWith({
        where: { symbol },
      });
    });

    it('should calculate new assessment when cache expired', async () => {
      const symbol = 'AAPL';
      const expiredAssessment = {
        id: '1',
        symbol,
        riskScore: 45,
        riskLevel: 'medium',
        technicalScore: 50,
        rsiScore: 60,
        macdScore: 50,
        bollingerScore: 40,
        fibonacciScore: 50,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.findUnique.mockResolvedValue(expiredAssessment as any);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue(null);

      const newAssessment = {
        ...expiredAssessment,
        riskScore: 50,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(newAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(prismaMock.riskAssessment.upsert).toHaveBeenCalled();
      expect(result.riskScore).toBe(50);
    });

    it('should calculate risk score with 80/20 weight when news available', async () => {
      const symbol = 'AAPL';
      const technicalRiskScore = 50; // 100 - totalScore(50)
      const newsScore = 80;
      const expectedRiskScore = Math.round(50 * 0.8 + 80 * 0.2);

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue({
        score: newsScore,
        sentiment: 'negative' as const,
        articleCount: 10,
      });

      const newAssessment = {
        id: '1',
        symbol,
        riskScore: expectedRiskScore,
        riskLevel: 'medium',
        technicalScore: technicalRiskScore,
        rsiScore: 50,
        macdScore: 50,
        bollingerScore: 50,
        fibonacciScore: 50,
        newsScore,
        newsSentiment: 'negative',
        newsArticleCount: 10,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(newAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(result.riskScore).toBe(expectedRiskScore);
      expect(result.newsScore).toBe(newsScore);
    });

    it('should use technical score only when news unavailable', async () => {
      const symbol = 'AAPL';
      const technicalRiskScore = 50;

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue(null);

      const newAssessment = {
        id: '1',
        symbol,
        riskScore: technicalRiskScore,
        riskLevel: 'medium',
        technicalScore: technicalRiskScore,
        rsiScore: 50,
        macdScore: 50,
        bollingerScore: 50,
        fibonacciScore: 50,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(newAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(result.riskScore).toBe(technicalRiskScore);
      expect(result.newsScore).toBeNull();
    });
  });

  describe('getRiskLevel', () => {
    it('should return "low" for scores 0-40', () => {
      expect(service['getRiskLevel'](0)).toBe('low');
      expect(service['getRiskLevel'](20)).toBe('low');
      expect(service['getRiskLevel'](40)).toBe('low');
    });

    it('should return "medium" for scores 41-70', () => {
      expect(service['getRiskLevel'](41)).toBe('medium');
      expect(service['getRiskLevel'](55)).toBe('medium');
      expect(service['getRiskLevel'](70)).toBe('medium');
    });

    it('should return "high" for scores 71-100', () => {
      expect(service['getRiskLevel'](71)).toBe('high');
      expect(service['getRiskLevel'](85)).toBe('high');
      expect(service['getRiskLevel'](100)).toBe('high');
    });
  });

  describe('getPortfolioRiskAssessments', () => {
    it('should return risk summary for all holdings in portfolio', async () => {
      const portfolioId = 'portfolio-1';
      const portfolio = {
        id: portfolioId,
        name: 'My Portfolio',
        holdings: [
          { symbol: 'AAPL', quantity: new Decimal(100) },
          { symbol: 'GOOGL', quantity: new Decimal(50) },
        ],
      };

      prismaMock.portfolio.findUnique.mockResolvedValue(portfolio as any);

      const assessment = {
        id: '1',
        symbol: 'AAPL',
        riskScore: 45,
        riskLevel: 'medium',
        technicalScore: 50,
        rsiScore: 60,
        macdScore: 50,
        bollingerScore: 40,
        fibonacciScore: 50,
        newsScore: 30,
        newsSentiment: 'negative',
        newsArticleCount: 5,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.findUnique.mockResolvedValue(assessment as any);
      prismaMock.stockPrice.findFirst.mockResolvedValue({
        symbol: 'AAPL',
        price: new Decimal(150),
      } as any);

      const result = await service.getPortfolioRiskAssessments(portfolioId);

      expect(result.portfolioId).toBe(portfolioId);
      expect(result.holdings).toHaveLength(2);
      expect(result.holdings[0].symbol).toBe('AAPL');
    });
  });

  describe('batchCalculate', () => {
    it('should calculate risk assessments for multiple symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue(null);

      const mockAssessment = {
        id: '1',
        symbol: 'AAPL',
        riskScore: 50,
        riskLevel: 'medium',
        technicalScore: 50,
        rsiScore: 50,
        macdScore: 50,
        bollingerScore: 50,
        fibonacciScore: 50,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: new Decimal(0.8),
        newsWeight: new Decimal(0.2),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(mockAssessment as any);

      const result = await service.batchCalculate(symbols);

      expect(result).toHaveLength(3);
    });
  });
});
