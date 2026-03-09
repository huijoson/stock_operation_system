import { PrismaClient, HoldingAdvice, RiskAssessment } from '@prisma/client';

export type AdviceType = 'reduce' | 'hold' | 'add';

export interface GenerateAdviceResult {
  id: string;
  symbol: string;
  adviceType: AdviceType;
  reasons: string[];
  confidence: number;
  riskAssessmentId: string | null;
  generatedAt: Date;
  expiresAt: Date;
}

export class HoldingAdviceService {
  constructor(private prisma: PrismaClient) {}

  async getAdvice(symbol: string): Promise<HoldingAdvice | null> {
    const cached = await this.prisma.holdingAdvice.findUnique({
      where: { symbol },
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    return null;
  }

  async generateAdvice(symbol: string): Promise<GenerateAdviceResult> {
    const cached = await this.getAdvice(symbol);
    if (cached) {
      return cached as GenerateAdviceResult;
    }

    const riskAssessment = await this.prisma.riskAssessment.findUnique({
      where: { symbol },
    });

    if (!riskAssessment) {
      throw new Error('風險評估不存在');
    }

    const { adviceType, reasons, confidence } = this.generateAdviceLogic(riskAssessment);

    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000);

    const advice = await this.prisma.holdingAdvice.upsert({
      where: { symbol },
      create: {
        symbol,
        adviceType,
        reasons,
        confidence,
        riskAssessmentId: riskAssessment.id,
        generatedAt,
        expiresAt,
      },
      update: {
        adviceType,
        reasons,
        confidence,
        riskAssessmentId: riskAssessment.id,
        generatedAt,
        expiresAt,
      },
    });

    return advice as GenerateAdviceResult;
  }

  async getAdviceForPortfolio(symbols: string[]): Promise<GenerateAdviceResult[]> {
    const advices: GenerateAdviceResult[] = [];

    for (const symbol of symbols) {
      try {
        const advice = await this.generateAdvice(symbol);
        advices.push(advice);
      } catch (error) {
        console.error(`無法生成 ${symbol} 的建議:`, error);
      }
    }

    return advices;
  }

  private generateAdviceLogic(riskAssessment: RiskAssessment): {
    adviceType: AdviceType;
    reasons: string[];
    confidence: number;
  } {
    const { riskLevel, riskScore, technicalScore, rsiScore, macdScore, newsScore, newsSentiment } =
      riskAssessment;

    const reasons: string[] = [];
    let adviceType: AdviceType = 'hold';
    let confidence = 50;

    if (riskLevel === 'high') {
      adviceType = 'reduce';
      confidence = 70 + Math.min(riskScore - 70, 30);
      reasons.push('技術指標顯示高風險');

      if (rsiScore < 30) {
        reasons.push('RSI 顯示超買');
      }
      if (macdScore < 30) {
        reasons.push('MACD 出現賣出訊號');
      }
      if (newsSentiment === 'negative') {
        reasons.push('負面新聞情緒');
      }
    } else if (riskLevel === 'low') {
      if (technicalScore >= 70) {
        adviceType = 'add';
        confidence = 70 + Math.min(technicalScore - 70, 30);
        reasons.push('低風險等級');
        reasons.push('技術指標強勁');

        if (rsiScore >= 70) {
          reasons.push('RSI 顯示超賣，可能反彈');
        }
        if (macdScore >= 70) {
          reasons.push('MACD 黃金交叉，買入訊號');
        }
        if (newsSentiment === 'positive') {
          reasons.push('正面新聞情緒');
        }
      } else {
        adviceType = 'hold';
        confidence = 50 + Math.min(technicalScore - 50, 20);
        reasons.push('低風險等級，但技術指標中性');
      }
    } else {
      adviceType = 'hold';
      confidence = 40 + Math.abs(50 - riskScore) / 2;
      reasons.push('技術指標中性');
      reasons.push('無明顯買賣訊號');

      if (newsScore !== null && newsScore !== undefined) {
        if (newsSentiment === 'positive') {
          reasons.push('新聞情緒偏正面');
        } else if (newsSentiment === 'negative') {
          reasons.push('新聞情緒偏負面');
        }
      }
    }

    if (reasons.length === 0) {
      reasons.push('無明確理由');
    }

    return {
      adviceType,
      reasons,
      confidence: Math.round(Math.min(Math.max(confidence, 0), 100)),
    };
  }
}

