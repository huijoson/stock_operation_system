import { PrismaClient } from '@prisma/client';

export interface SentimentResult {
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  articleCount: number;
}

/**
 * SentimentAnalysisService - 新聞情緒分析服務
 * 暫時回傳 null，完整實作在 Phase 8
 */
export class SentimentAnalysisService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 分析股票的新聞情緒
   * @returns null if no news data available
   */
  async analyzeSentiment(symbol: string): Promise<SentimentResult | null> {
    return null;
  }
}
