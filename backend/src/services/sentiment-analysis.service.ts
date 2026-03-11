import { PrismaClient } from '../lib/prisma-client';
import Decimal from 'decimal.js';

export interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: 'low' | 'medium' | 'high';
}

export interface SentimentScoreResult {
  symbol: string;
  averageScore: number;
  overallLabel: 'positive' | 'neutral' | 'negative';
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

export interface SentimentAnalysisResult {
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  articleCount: number;
}

export class SentimentAnalysisService {
  private positiveKeywords = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'profit', 'growth',
    'beat', 'exceed', 'upgrade', 'bullish', 'record', 'strong',
    'acquisition', 'partnership', 'breakthrough', 'innovation',
  ];

  private negativeKeywords = [
    'plunge', 'crash', 'drop', 'fall', 'loss', 'decline', 'miss',
    'downgrade', 'bearish', 'layoff', 'lawsuit', 'investigation',
    'bankruptcy', 'recall', 'warning', 'concern', 'risk',
  ];

  constructor(private prisma: PrismaClient) {}

  private analyzeText(headline: string, summary: string): SentimentResult {
    const text = `${headline} ${summary}`.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of this.positiveKeywords) {
      if (text.includes(keyword)) positiveCount++;
    }
    for (const keyword of this.negativeKeywords) {
      if (text.includes(keyword)) negativeCount++;
    }

    const totalMatches = positiveCount + negativeCount;
    let score = 0;
    let label: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence: 'low' | 'medium' | 'high' = 'low';

    if (totalMatches === 0) {
      score = 0;
      label = 'neutral';
      confidence = 'low';
    } else {
      score = ((positiveCount - negativeCount) / totalMatches) * 0.8;
      if (score > 0.2) label = 'positive';
      else if (score < -0.2) label = 'negative';
      
      if (totalMatches >= 3) confidence = 'high';
      else if (totalMatches >= 1) confidence = 'medium';
    }

    return { score, label, confidence };
  }

  async getSentimentScore(symbol: string): Promise<SentimentScoreResult | null> {
    const recentNews = await this.prisma.stockNews.findMany({
      where: {
        symbol,
        publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    if (recentNews.length === 0) return null;

    let totalScore = 0;
    let positiveCount = 0, negativeCount = 0, neutralCount = 0;

    for (const news of recentNews) {
      totalScore += new Decimal(news.sentimentScore).toNumber();
      if (news.sentimentLabel === 'positive') positiveCount++;
      else if (news.sentimentLabel === 'negative') negativeCount++;
      else neutralCount++;
    }

    const averageScore = totalScore / recentNews.length;
    let overallLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (averageScore > 0.1) overallLabel = 'positive';
    else if (averageScore < -0.1) overallLabel = 'negative';

    return { symbol, averageScore, overallLabel, newsCount: recentNews.length, positiveCount, negativeCount, neutralCount };
  }

  async analyzeSentiment(symbol: string): Promise<SentimentAnalysisResult | null> {
    const sentimentData = await this.getSentimentScore(symbol);
    
    if (!sentimentData) {
      return null;
    }

    const normalizedScore = Math.max(0, Math.min(100, (sentimentData.averageScore + 1) * 50));

    return {
      score: normalizedScore,
      sentiment: sentimentData.overallLabel,
      articleCount: sentimentData.newsCount,
    };
  }
}
