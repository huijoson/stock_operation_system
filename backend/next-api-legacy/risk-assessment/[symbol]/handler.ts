import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';
import { RiskAssessmentService } from '@/services/risk-assessment.service';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    await requireAuth(request);

    const { symbol } = await params;

    const sentimentService = new SentimentAnalysisService(prisma);
    const riskService = new RiskAssessmentService(
      prisma,
      sentimentService
    );

    const assessment = await riskService.getRiskAssessment(symbol);

    const riskLevelLabels = {
      low: '低風險',
      medium: '中風險',
      high: '高風險',
    };

    const response = {
      symbol: assessment.symbol,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      riskLevelLabel: riskLevelLabels[assessment.riskLevel],
      technicalAnalysis: {
        score: assessment.technicalScore,
        components: {
          rsi: {
            score: assessment.rsiScore,
            weight: 0.25,
            signal: getRSISignal(assessment.rsiScore),
          },
          macd: {
            score: assessment.macdScore,
            weight: 0.25,
            signal: getMACDSignal(assessment.macdScore),
          },
          bollinger: {
            score: assessment.bollingerScore,
            weight: 0.25,
            signal: getBollingerSignal(assessment.bollingerScore),
          },
          fibonacci: {
            score: assessment.fibonacciScore,
            weight: 0.25,
            signal: getFibonacciSignal(assessment.fibonacciScore),
          },
        },
      },
      newsSentiment: assessment.newsScore
        ? {
            score: assessment.newsScore,
            sentiment: assessment.newsSentiment,
            sentimentLabel: getSentimentLabel(assessment.newsSentiment!),
            articleCount: assessment.newsArticleCount,
            confidence: 'medium',
          }
        : null,
      weights: {
        technical: assessment.technicalWeight,
        news: assessment.newsWeight,
      },
      calculatedAt: assessment.calculatedAt.toISOString(),
      expiresAt: assessment.expiresAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching risk assessment:', error);

    if (error.message?.includes('不足') || error.message?.includes('No price data')) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_DATA',
          message: '資料不足，無法評估',
          minDataDays: 50,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getRSISignal(score: number): string {
  if (score <= 30) return 'RSI 超賣區域，可能反彈';
  if (score >= 70) return 'RSI 超買區域，可能回調';
  return 'RSI 中性區域';
}

function getMACDSignal(score: number): string {
  if (score <= 30) return 'MACD 賣出訊號';
  if (score >= 70) return 'MACD 買入訊號';
  return 'MACD 中性';
}

function getBollingerSignal(score: number): string {
  if (score <= 30) return '價格接近下軌，可能反彈';
  if (score >= 70) return '價格接近上軌，可能回調';
  return '價格於布林通道中段';
}

function getFibonacciSignal(score: number): string {
  if (score <= 30) return '價格接近支撐位';
  if (score >= 70) return '價格接近壓力位';
  return '價格於斐波那契中段';
}

function getSentimentLabel(sentiment: string): string {
  const labels: Record<string, string> = {
    positive: '正面',
    neutral: '中性',
    negative: '負面',
  };
  return labels[sentiment] || '未知';
}
