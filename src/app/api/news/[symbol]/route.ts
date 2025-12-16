import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NewsService } from '@/services/news.service';
import { FinnhubClient } from '@/lib/api/finnhub-client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
): Promise<NextResponse> {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = rawSymbol.toUpperCase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Finnhub API Key 未設定',
        },
        { status: 500 }
      );
    }

    const finnhubClient = new FinnhubClient(apiKey);
    const service = new NewsService(prisma, finnhubClient);

    const news = await service.getNews(symbol, limit);

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        news,
        count: news.length,
      },
    });
  } catch (error) {
    console.error('取得新聞失敗:', error);

    if (error instanceof Error && error.message.includes('速率限制')) {
      return NextResponse.json(
        {
          success: false,
          error: '新聞服務暫時不可用，請稍後再試',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '取得新聞失敗',
      },
      { status: 500 }
    );
  }
}
