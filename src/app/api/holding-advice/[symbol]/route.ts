import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { HoldingAdviceService } from '@/services/holding-advice.service';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
): Promise<NextResponse> {
  try {
    const symbol = params.symbol.toUpperCase();

    const service = new HoldingAdviceService(prisma);
    const advice = await service.generateAdvice(symbol);

    return NextResponse.json({
      success: true,
      data: advice,
    });
  } catch (error) {
    if (error instanceof Error && error.message === '風險評估不存在') {
      return NextResponse.json(
        {
          success: false,
          error: '風險評估不存在，請先進行風險評估',
          code: 'RISK_ASSESSMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    console.error('取得持股建議失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取得持股建議失敗',
      },
      { status: 500 }
    );
  }
}
