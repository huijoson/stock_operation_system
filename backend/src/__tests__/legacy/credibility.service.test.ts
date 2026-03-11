import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CredibilityService } from '@/services/credibility.service';
import { PrismaClient } from '../../lib/prisma-client';

jest.mock('../../lib/prisma-client');

describe('CredibilityService', () => {
  let service: CredibilityService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      newsSourceRating: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    } as any;

    service = new CredibilityService(mockPrisma);
  });

  describe('classifySource', () => {
    it('應該分類 SEC 為官方來源', async () => {
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([
        { sourceName: 'SEC', credibilityLevel: 'official' },
      ]);

      const credibility = await service.classifySource('SEC');
      expect(credibility).toBe('official');
    });

    it('應該分類 Reuters 為主流媒體', async () => {
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([
        { sourceName: 'Reuters', credibilityLevel: 'mainstream' },
      ]);

      const credibility = await service.classifySource('Reuters');
      expect(credibility).toBe('mainstream');
    });

    it('應該分類未知來源為未驗證', async () => {
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([]);

      const credibility = await service.classifySource('Unknown Blog');
      expect(credibility).toBe('unverified');
    });

    it('應該不區分大小寫', async () => {
      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue([
        { sourceName: 'Bloomberg', credibilityLevel: 'mainstream' },
      ]);

      const credibility = await service.classifySource('BLOOMBERG');
      expect(credibility).toBe('mainstream');
    });
  });

  describe('getAllSourceRatings', () => {
    it('應該取得所有來源評等', async () => {
      const mockRatings = [
        {
          id: '1',
          sourceName: 'SEC',
          credibilityLevel: 'official',
          description: '美國證券交易委員會',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          sourceName: 'Reuters',
          credibilityLevel: 'mainstream',
          description: '路透社',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.newsSourceRating.findMany as jest.Mock).mockResolvedValue(mockRatings);

      const ratings = await service.getAllSourceRatings();
      expect(ratings).toHaveLength(2);
      expect(ratings[0].sourceName).toBe('SEC');
      expect(ratings[1].sourceName).toBe('Reuters');
    });
  });

  describe('updateSourceRating', () => {
    it('應該能更新或新增來源評等', async () => {
      (mockPrisma.newsSourceRating.upsert as jest.Mock).mockResolvedValue({
        id: '1',
        sourceName: 'New Source',
        credibilityLevel: 'mainstream',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateSourceRating('New Source', 'mainstream');
      expect(result.sourceName).toBe('New Source');
      expect(result.credibilityLevel).toBe('mainstream');
    });
  });
});
