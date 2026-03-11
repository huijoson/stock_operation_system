import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import Decimal from 'decimal.js';
import { HoldingAdviceService } from '@/services/holding-advice.service';
import { PrismaClient } from '../../lib/prisma-client';

jest.mock('../../lib/prisma-client');

describe('HoldingAdviceService', () => {
  let service: HoldingAdviceService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      riskAssessment: {
        findUnique: jest.fn(),
      },
      holdingAdvice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    } as any;

    service = new HoldingAdviceService(mockPrisma);
  });

  describe('generateAdvice', () => {
    it('應該建議減碼當風險等級為 high', async () => {
      const mockRiskAssessment = {
        id: 'risk-1',
        symbol: 'AAPL',
        riskScore: 75,
        riskLevel: 'high',
        technicalScore: 25,
        rsiScore: 20,
        macdScore: 25,
        bollingerScore: 30,
        fibonacciScore: 25,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: new Decimal('0.80'),
        newsWeight: new Decimal('0.20'),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      (mockPrisma.riskAssessment.findUnique as jest.Mock).mockResolvedValue(mockRiskAssessment);
      (mockPrisma.holdingAdvice.upsert as jest.Mock).mockResolvedValue({
        id: 'advice-1',
        symbol: 'AAPL',
        adviceType: 'reduce',
        reasons: ['技術指標顯示高風險', 'RSI 顯示超買'],
        confidence: 75,
        riskAssessmentId: 'risk-1',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const advice = await service.generateAdvice('AAPL');

      expect(advice.adviceType).toBe('reduce');
      expect(advice.confidence).toBeGreaterThan(50);
      expect(Array.isArray(advice.reasons)).toBe(true);
      expect(advice.reasons.length).toBeGreaterThan(0);
    });

    it('應該建議持有當風險等級為 medium', async () => {
      const mockRiskAssessment = {
        id: 'risk-2',
        symbol: 'MSFT',
        riskScore: 55,
        riskLevel: 'medium',
        technicalScore: 45,
        rsiScore: 50,
        macdScore: 45,
        bollingerScore: 40,
        fibonacciScore: 45,
        newsScore: null,
        newsSentiment: null,
        newsArticleCount: 0,
        technicalWeight: new Decimal('0.80'),
        newsWeight: new Decimal('0.20'),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      (mockPrisma.riskAssessment.findUnique as jest.Mock).mockResolvedValue(mockRiskAssessment);
      (mockPrisma.holdingAdvice.upsert as jest.Mock).mockResolvedValue({
        id: 'advice-2',
        symbol: 'MSFT',
        adviceType: 'hold',
        reasons: ['技術指標中性', '無明顯買賣訊號'],
        confidence: 55,
        riskAssessmentId: 'risk-2',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const advice = await service.generateAdvice('MSFT');

      expect(advice.adviceType).toBe('hold');
      expect(advice.confidence).toBeGreaterThan(40);
      expect(advice.confidence).toBeLessThan(70);
    });

    it('應該建議加碼當風險等級為 low 且技術指標強勁', async () => {
      const mockRiskAssessment = {
        id: 'risk-3',
        symbol: 'GOOGL',
        riskScore: 25,
        riskLevel: 'low',
        technicalScore: 75,
        rsiScore: 80,
        macdScore: 75,
        bollingerScore: 70,
        fibonacciScore: 75,
        newsScore: 80,
        newsSentiment: 'positive',
        newsArticleCount: 5,
        technicalWeight: new Decimal('0.80'),
        newsWeight: new Decimal('0.20'),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      (mockPrisma.riskAssessment.findUnique as jest.Mock).mockResolvedValue(mockRiskAssessment);
      (mockPrisma.holdingAdvice.upsert as jest.Mock).mockResolvedValue({
        id: 'advice-3',
        symbol: 'GOOGL',
        adviceType: 'add',
        reasons: ['低風險等級', '技術指標強勁', '正面新聞情緒'],
        confidence: 80,
        riskAssessmentId: 'risk-3',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const advice = await service.generateAdvice('GOOGL');

      expect(advice.adviceType).toBe('add');
      expect(advice.confidence).toBeGreaterThan(70);
    });

    it('應該拋出錯誤當風險評估不存在', async () => {
      (mockPrisma.riskAssessment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateAdvice('INVALID')).rejects.toThrow('風險評估不存在');
    });

    it('應該使用快取的建議如果尚未過期', async () => {
      const cachedAdvice = {
        id: 'advice-cached',
        symbol: 'TSLA',
        adviceType: 'hold',
        reasons: ['快取的建議'],
        confidence: 60,
        riskAssessmentId: 'risk-4',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 小時後過期
        createdAt: new Date(),
      };

      (mockPrisma.holdingAdvice.findUnique as jest.Mock).mockResolvedValue(cachedAdvice);

      const advice = await service.getAdvice('TSLA');

      expect(advice).toEqual(cachedAdvice);
      expect(mockPrisma.riskAssessment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getAdviceForPortfolio', () => {
    it('應該為投資組合中的所有持股生成建議', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      (mockPrisma.riskAssessment.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'risk-1',
          symbol: 'AAPL',
          riskScore: 75,
          riskLevel: 'high',
          technicalScore: 25,
          rsiScore: 20,
          macdScore: 25,
          bollingerScore: 30,
          fibonacciScore: 25,
          newsScore: null,
          newsSentiment: null,
          newsArticleCount: 0,
          technicalWeight: new Decimal('0.80'),
          newsWeight: new Decimal('0.20'),
          calculatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'risk-2',
          symbol: 'MSFT',
          riskScore: 55,
          riskLevel: 'medium',
          technicalScore: 45,
          rsiScore: 50,
          macdScore: 45,
          bollingerScore: 40,
          fibonacciScore: 45,
          newsScore: null,
          newsSentiment: null,
          newsArticleCount: 0,
          technicalWeight: new Decimal('0.80'),
          newsWeight: new Decimal('0.20'),
          calculatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'risk-3',
          symbol: 'GOOGL',
          riskScore: 25,
          riskLevel: 'low',
          technicalScore: 75,
          rsiScore: 80,
          macdScore: 75,
          bollingerScore: 70,
          fibonacciScore: 75,
          newsScore: null,
          newsSentiment: null,
          newsArticleCount: 0,
          technicalWeight: new Decimal('0.80'),
          newsWeight: new Decimal('0.20'),
          calculatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        });

      (mockPrisma.holdingAdvice.upsert as jest.Mock)
        .mockResolvedValueOnce({
          id: 'advice-1',
          symbol: 'AAPL',
          adviceType: 'reduce',
          reasons: ['高風險'],
          confidence: 75,
          riskAssessmentId: 'risk-1',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'advice-2',
          symbol: 'MSFT',
          adviceType: 'hold',
          reasons: ['中性'],
          confidence: 55,
          riskAssessmentId: 'risk-2',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'advice-3',
          symbol: 'GOOGL',
          adviceType: 'add',
          reasons: ['低風險'],
          confidence: 80,
          riskAssessmentId: 'risk-3',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        });

      const advices = await service.getAdviceForPortfolio(symbols);

      expect(advices).toHaveLength(3);
      expect(advices[0].adviceType).toBe('reduce');
      expect(advices[1].adviceType).toBe('hold');
      expect(advices[2].adviceType).toBe('add');
    });
  });
});
