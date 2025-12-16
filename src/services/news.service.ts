import { PrismaClient, StockNews } from '@prisma/client';
import { FinnhubClient, FinnhubNews } from '@/lib/api/finnhub-client';
import { CredibilityService } from './credibility.service';
import Decimal from 'decimal.js';

export interface NewsResult {
  id: string;
  symbol: string;
  externalId: string | null;
  headline: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: Date;
  credibility: string;
  sentimentScore: Decimal;
  sentimentLabel: string;
  sentimentConfidence: string;
}

export class NewsService {
  private cacheExpiry = 15 * 60 * 1000;
  private credibilityService: CredibilityService;

  constructor(
    private prisma: PrismaClient,
    private finnhubClient: FinnhubClient
  ) {
    this.credibilityService = new CredibilityService(prisma);
  }

  async getNews(symbol: string, limit: number = 10): Promise<StockNews[]> {
    const cachedNews = await this.prisma.stockNews.findMany({
      where: {
        symbol,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    if (cachedNews.length > 0) {
      return cachedNews;
    }

    try {
      const finnhubNews = await this.finnhubClient.getCompanyNews(symbol);
      await this.storeNews(symbol, finnhubNews);

      return await this.prisma.stockNews.findMany({
        where: { symbol },
        orderBy: {
          publishedAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error(`取得 ${symbol} 新聞失敗:`, error);
      
      if (cachedNews.length === 0) {
        throw error;
      }
      
      return cachedNews;
    }
  }

  async getNewsForPortfolio(symbols: string[]): Promise<Record<string, StockNews[]>> {
    const newsMap: Record<string, StockNews[]> = {};

    for (const symbol of symbols) {
      try {
        newsMap[symbol] = await this.getNews(symbol, 5);
      } catch (error) {
        console.error(`取得 ${symbol} 新聞失敗:`, error);
        newsMap[symbol] = [];
      }
    }

    return newsMap;
  }

  private async storeNews(symbol: string, finnhubNews: FinnhubNews[]): Promise<void> {
    if (finnhubNews.length === 0) return;

    const sources = finnhubNews.map((news) => news.source);
    const credibilityMap = await this.credibilityService.classifyMultipleSources(sources);

    const newsToCreate = finnhubNews.map((news) => {
      const credibility = credibilityMap.get(news.source) || 'unverified';
      const sentiment = this.analyzeSentiment(news.headline, news.summary);

      return {
        symbol,
        externalId: news.id.toString(),
        headline: news.headline,
        summary: news.summary || null,
        url: news.url,
        imageUrl: news.image || null,
        source: news.source,
        publishedAt: new Date(news.datetime * 1000),
        credibility,
        sentimentScore: new Decimal(sentiment.score),
        sentimentLabel: sentiment.label,
        sentimentConfidence: sentiment.confidence,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + this.cacheExpiry),
      };
    });

    await this.prisma.stockNews.createMany({
      data: newsToCreate,
      skipDuplicates: true,
    });
  }

  private analyzeSentiment(headline: string, summary: string): {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: 'low' | 'medium' | 'high';
  } {
    const positiveKeywords = [
      'surge', 'soar', 'jump', 'rally', 'gain', 'profit', 'growth',
      'beat', 'exceed', 'upgrade', 'bullish', 'record', 'strong',
      'acquisition', 'partnership', 'breakthrough', 'innovation',
    ];

    const negativeKeywords = [
      'plunge', 'crash', 'drop', 'fall', 'loss', 'decline', 'miss',
      'downgrade', 'bearish', 'layoff', 'lawsuit', 'investigation',
      'bankruptcy', 'recall', 'warning', 'concern', 'risk',
    ];

    const text = `${headline} ${summary || ''}`.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of positiveKeywords) {
      if (text.includes(keyword)) {
        positiveCount++;
      }
    }

    for (const keyword of negativeKeywords) {
      if (text.includes(keyword)) {
        negativeCount++;
      }
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

      if (score > 0.2) {
        label = 'positive';
      } else if (score < -0.2) {
        label = 'negative';
      } else {
        label = 'neutral';
      }

      if (totalMatches >= 3) {
        confidence = 'high';
      } else if (totalMatches >= 1) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
    }

    return { score, label, confidence };
  }
}
