import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';

const prisma = new PrismaClient();
const sentimentService = new SentimentAnalysisService(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: '股票代號為必填欄位' },
        { status: 400 }
      );
    }

    const sentimentData = await sentimentService.getSentimentScore(symbol.toUpperCase());

    if (!sentimentData) {
      return NextResponse.json(
        { 
          error: 'INSUFFICIENT_DATA',
          message: '近期沒有足夠的新聞資料進行情緒分析'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol: sentimentData.symbol,
      averageScore: sentimentData.averageScore,
      overallSentiment: sentimentData.overallLabel,
      newsCount: sentimentData.newsCount,
      breakdown: {
        positive: sentimentData.positiveCount,
        neutral: sentimentData.neutralCount,
        negative: sentimentData.negativeCount,
      },
      analysisWindow: '過去 7 天',
    });
  } catch (error) {
    console.error('Error fetching sentiment analysis:', error);
    return NextResponse.json(
      { error: '無法取得情緒分析資料' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
