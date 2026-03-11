import { RiskAssessmentService } from '@/services/risk-assessment.service';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';
import { PrismaClient } from '../../lib/prisma-client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('@/services/sentiment-analysis.service');

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
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.findUnique.mockResolvedValue(cachedAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(result).toEqual(cachedAssessment);
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
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const mockPrices = Array.from({ length: 100 }, (_, i) => ({
        id: `price-${i}`,
        symbol,
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        open: 150,
        high: 155,
        low: 145,
        close: 150,
        volume: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prismaMock.riskAssessment.findUnique.mockResolvedValue(expiredAssessment as any);
      prismaMock.stockPrice.findMany.mockResolvedValue(mockPrices as any);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue(null);
      
      const newAssessment = {
        ...expiredAssessment,
        technicalScore: 50,
        riskScore: 50,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(newAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(prismaMock.stockPrice.findMany).toHaveBeenCalledWith({
        where: { symbol },
        orderBy: { date: 'desc' },
        take: 100,
      });
      expect(prismaMock.riskAssessment.upsert).toHaveBeenCalled();
    });

    it('should calculate risk score with 80/20 weight when news available', async () => {
      const symbol = 'AAPL';
      const technicalScore = 60;
      const newsScore = 80;
      const expectedRiskScore = Math.round(60 * 0.8 + 80 * 0.2);

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      
      const technicalIndicators = {
        rsi: 60,
        macd: 60,
        bollingerPosition: 0.6,
        fibonacciLevel: 0.5,
      };

      (technicalScoreService.calculateTechnicalScore as jest.Mock).mockResolvedValue(technicalIndicators);
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
        technicalScore,
        rsiScore: 40,
        macdScore: 40,
        bollingerScore: 40,
        fibonacciScore: 50,
        newsScore,
        newsSentiment: 'negative',
        newsArticleCount: 10,
        technicalWeight: 0.8,
        newsWeight: 0.2,
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
      const technicalScore = 75;

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      
      const technicalIndicators = {
        rsi: 75,
        macd: 75,
        bollingerPosition: 0.75,
        fibonacciLevel: 0.618,
      };

      (technicalScoreService.calculateTechnicalScore as jest.Mock).mockResolvedValue(technicalIndicators);
      (sentimentService.analyzeSentiment as jest.Mock).mockResolvedValue(null);

      const newAssessment = {
        id: '1',
        symbol,
        riskScore: technicalScore,
        riskLevel: 'high',
        technicalScore,
        rsiScore: 25,
        macdScore: 25,
        bollingerScore: 25,
        fibonacciScore: 38,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(newAssessment as any);

      const result = await service.getRiskAssessment(symbol);

      expect(result.riskScore).toBe(technicalScore);
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
    it('should return risk assessments for all holdings in portfolio', async () => {
      const portfolioId = 'portfolio-1';
      const holdings = [
        { symbol: 'AAPL', shares: 100 },
        { symbol: 'GOOGL', shares: 50 },
      ];

      prismaMock.holding.findMany.mockResolvedValue(holdings as any);

      const aaplAssessment = {
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
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const googlAssessment = {
        id: '2',
        symbol: 'GOOGL',
        riskScore: 65,
        riskLevel: 'medium',
        technicalScore: 70,
        rsiScore: 70,
        macdScore: 70,
        bollingerScore: 70,
        fibonacciScore: 70,
        newsScore: 40,
        newsSentiment: 'neutral',
        newsArticleCount: 3,
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.findUnique
        .mockResolvedValueOnce(aaplAssessment as any)
        .mockResolvedValueOnce(googlAssessment as any);

      const result = await service.getPortfolioRiskAssessments(portfolioId);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[1].symbol).toBe('GOOGL');
    });
  });

  describe('batchCalculate', () => {
    it('should calculate risk assessments for multiple symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      prismaMock.riskAssessment.findUnique.mockResolvedValue(null);
      
      const technicalIndicators = {
        rsi: 50,
        macd: 50,
        bollingerPosition: 0.5,
        fibonacciLevel: 0.5,
      };

      (technicalScoreService.calculateTechnicalScore as jest.Mock).mockResolvedValue(technicalIndicators);
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
        technicalWeight: 0.8,
        newsWeight: 0.2,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      prismaMock.riskAssessment.upsert.mockResolvedValue(mockAssessment as any);

      const result = await service.batchCalculate(symbols);

      expect(result).toHaveLength(3);
      expect(technicalScoreService.calculateTechnicalScore).toHaveBeenCalledTimes(3);
    });
  });
});
