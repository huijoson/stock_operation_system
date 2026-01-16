import { PrismaClient, RiskAssessment } from '@prisma/client';
import Decimal from 'decimal.js';
import { TechnicalScoreService, MarketData } from './technical-score.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { StockService } from './stock.service';

export interface RiskAssessmentResult {
  symbol: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  technicalScore: number;
  rsiScore: number;
  macdScore: number;
  bollingerScore: number;
  fibonacciScore: number;
  newsScore: number | null;
  newsSentiment: 'positive' | 'neutral' | 'negative' | null;
  newsArticleCount: number;
  technicalWeight: number;
  newsWeight: number;
  calculatedAt: Date;
  expiresAt: Date;
}

export interface PortfolioRiskSummary {
  portfolioId: string;
  portfolioName: string;
  overallRisk: 'low' | 'medium' | 'high';
  holdings: HoldingRiskSummary[];
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

export interface HoldingRiskSummary {
  symbol: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  marketValue: string;
}

/**
 * RiskAssessmentService - 持股風險評估服務
 * 整合技術分析與新聞情緒分析，計算持股風險評分
 */
export class RiskAssessmentService {
  private static readonly CACHE_DURATION_HOURS = 24;
  private static readonly TECHNICAL_WEIGHT = 0.8;
  private static readonly NEWS_WEIGHT = 0.2;
  private technicalScoreService: TechnicalScoreService;

  constructor(
    private prisma: PrismaClient,
    private sentimentService: SentimentAnalysisService
  ) {
    this.technicalScoreService = new TechnicalScoreService();
  }

  /**
   * 取得股票的風險評估（含快取）
   */
  async getRiskAssessment(symbol: string): Promise<RiskAssessmentResult> {
    const cached = await this.prisma.riskAssessment.findUnique({
      where: { symbol },
    });

    if (cached && cached.expiresAt > new Date()) {
      return this.mapToResult(cached);
    }

    return this.calculateAndCache(symbol);
  }

  /**
   * 取得投資組合的風險評估
   */
  async getPortfolioRiskAssessments(portfolioId: string): Promise<PortfolioRiskSummary> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        holdings: true,
      },
    });

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdingRisks: HoldingRiskSummary[] = [];

    for (const holding of portfolio.holdings) {
      const assessment = await this.getRiskAssessment(holding.symbol);
      const currentPrice = await this.getCurrentPrice(holding.symbol);
      const marketValue = new Decimal(holding.quantity.toString())
        .mul(currentPrice)
        .toFixed(2);

      holdingRisks.push({
        symbol: holding.symbol,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        marketValue,
      });
    }

    const highRiskCount = holdingRisks.filter(h => h.riskLevel === 'high').length;
    const mediumRiskCount = holdingRisks.filter(h => h.riskLevel === 'medium').length;
    const lowRiskCount = holdingRisks.filter(h => h.riskLevel === 'low').length;

    const totalHoldings = holdingRisks.length;
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    
    if (highRiskCount / totalHoldings > 0.3) {
      overallRisk = 'high';
    } else if (mediumRiskCount / totalHoldings > 0.5) {
      overallRisk = 'medium';
    }

    return {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      overallRisk,
      holdings: holdingRisks,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };
  }

  /**
   * 批次計算多個股票的風險評估
   */
  async batchCalculate(symbols: string[]): Promise<RiskAssessmentResult[]> {
    const results: RiskAssessmentResult[] = [];

    for (const symbol of symbols) {
      try {
        const assessment = await this.calculateAndCache(symbol);
        results.push(assessment);
      } catch (error) {
        console.error(`Failed to calculate risk for ${symbol}:`, error);
      }
    }

    return results;
  }

  /**
   * 計算並快取風險評估
   */
  private async calculateAndCache(symbol: string): Promise<RiskAssessmentResult> {
    const marketData = await this.getMarketData(symbol);
    const technicalScore = this.technicalScoreService.calculateScore(marketData);
    const sentimentData = await this.sentimentService.analyzeSentiment(symbol);

    const technicalRiskScore = 100 - technicalScore.totalScore;

    const rsiScore = 100 - technicalScore.components.rsi.score;
    const macdScore = 100 - technicalScore.components.macd.score;
    const bollingerScore = 100 - technicalScore.components.bollinger.score;
    const fibonacciScore = 100 - technicalScore.components.fibonacci.score;

    let riskScore: number;
    let newsScore: number | null = null;
    let newsSentiment: 'positive' | 'neutral' | 'negative' | null = null;
    let newsArticleCount = 0;

    if (sentimentData) {
      newsScore = sentimentData.score;
      newsSentiment = sentimentData.sentiment;
      newsArticleCount = sentimentData.articleCount;

      riskScore = Math.round(
        technicalRiskScore * RiskAssessmentService.TECHNICAL_WEIGHT +
        newsScore * RiskAssessmentService.NEWS_WEIGHT
      );
    } else {
      riskScore = technicalRiskScore;
    }

    const riskLevel = this.getRiskLevel(riskScore);
    const calculatedAt = new Date();
    const expiresAt = new Date(
      calculatedAt.getTime() + RiskAssessmentService.CACHE_DURATION_HOURS * 60 * 60 * 1000
    );

    const assessment = await this.prisma.riskAssessment.upsert({
      where: { symbol },
      create: {
        symbol,
        riskScore,
        riskLevel,
        technicalScore: technicalRiskScore,
        rsiScore,
        macdScore,
        bollingerScore,
        fibonacciScore,
        newsScore,
        newsSentiment,
        newsArticleCount,
        technicalWeight: new Decimal(RiskAssessmentService.TECHNICAL_WEIGHT),
        newsWeight: new Decimal(RiskAssessmentService.NEWS_WEIGHT),
        calculatedAt,
        expiresAt,
      },
      update: {
        riskScore,
        riskLevel,
        technicalScore: technicalRiskScore,
        rsiScore,
        macdScore,
        bollingerScore,
        fibonacciScore,
        newsScore,
        newsSentiment,
        newsArticleCount,
        calculatedAt,
        expiresAt,
      },
    });

    return this.mapToResult(assessment);
  }

  /**
   * 取得市場資料供技術分析使用
   */
  private async getMarketData(symbol: string): Promise<MarketData> {
    const stockService = new StockService();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 120); // Get 120 days of data

    const ohlcData = await stockService.getHistoricalOHLC(symbol, startDate, endDate);

    if (ohlcData.length < 50) {
      throw new Error(`Insufficient data for ${symbol}. Need at least 50 days of price data.`);
    }

    const currentPrice = new Decimal(ohlcData[ohlcData.length - 1].close.toString());
    const priceValues = ohlcData.map(p => new Decimal(p.close.toString()));
    const highs = ohlcData.map(p => new Decimal(p.high.toString()));
    const lows = ohlcData.map(p => new Decimal(p.low.toString()));

    const recentHigh = Decimal.max(...highs.slice(-20));
    const recentLow = Decimal.min(...lows.slice(-20));

    return {
      prices: priceValues,
      highs,
      lows,
      currentPrice,
      recentHigh,
      recentLow,
    };
  }

  /**
   * 根據風險分數判定風險等級
   */
  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore <= 40) {
      return 'low';
    } else if (riskScore <= 70) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * 取得當前股價
   */
  private async getCurrentPrice(symbol: string): Promise<Decimal> {
    const latestPrice = await this.prisma.stockPrice.findFirst({
      where: { symbol },
      orderBy: { date: 'desc' },
    });

    if (!latestPrice) {
      throw new Error(`No price data found for ${symbol}`);
    }

    return new Decimal(latestPrice.price.toString());
  }

  /**
   * 將資料庫模型轉換為結果型別
   */
  private mapToResult(assessment: RiskAssessment): RiskAssessmentResult {
    return {
      symbol: assessment.symbol,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel as 'low' | 'medium' | 'high',
      technicalScore: assessment.technicalScore,
      rsiScore: assessment.rsiScore,
      macdScore: assessment.macdScore,
      bollingerScore: assessment.bollingerScore,
      fibonacciScore: assessment.fibonacciScore,
      newsScore: assessment.newsScore,
      newsSentiment: assessment.newsSentiment as 'positive' | 'neutral' | 'negative' | null,
      newsArticleCount: assessment.newsArticleCount,
      technicalWeight: parseFloat(assessment.technicalWeight.toString()),
      newsWeight: parseFloat(assessment.newsWeight.toString()),
      calculatedAt: assessment.calculatedAt,
      expiresAt: assessment.expiresAt,
    };
  }
}
