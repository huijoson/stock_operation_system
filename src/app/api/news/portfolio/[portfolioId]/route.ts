import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NewsService } from '@/services/news.service';
import { FinnhubClient } from '@/lib/api/finnhub-client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
): Promise<NextResponse> {
  try {
    const { portfolioId } = params;

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        holdings: {
          where: {
            quantity: { gt: 0 },
          },
          select: {
            symbol: true,
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        {
          success: false,
          error: '投資組合不存在',
        },
        { status: 404 }
      );
    }

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

    const symbols = portfolio.holdings.map((h) => h.symbol);
    const finnhubClient = new FinnhubClient(apiKey);
    const service = new NewsService(prisma, finnhubClient);

    const newsMap = await service.getNewsForPortfolio(symbols);

    return NextResponse.json({
      success: true,
      data: {
        portfolioId,
        news: newsMap,
      },
    });
  } catch (error) {
    console.error('取得投資組合新聞失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: '取得投資組合新聞失敗',
      },
      { status: 500 }
    );
  }
}
