import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { HoldingAdviceService } from '@/services/holding-advice.service';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> }
): Promise<NextResponse> {
  try {
    const { portfolioId } = await params;

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

    const symbols = portfolio.holdings.map((h) => h.symbol);

    const service = new HoldingAdviceService(prisma);
    const advices = await service.getAdviceForPortfolio(symbols);

    return NextResponse.json({
      success: true,
      data: {
        portfolioId,
        advices,
      },
    });
  } catch (error) {
    console.error('取得投資組合持股建議失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取得投資組合持股建議失敗',
      },
      { status: 500 }
    );
  }
}
