import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';
import { RiskAssessmentService } from '@/services/risk-assessment.service';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const body = await request.json();
    const { symbols } = body;

    let symbolList: string[];
    if (symbols && Array.isArray(symbols) && symbols.length > 0) {
      symbolList = symbols;
    } else {
      const allSymbols = await prisma.holding.findMany({
        distinct: ['symbol'],
        select: { symbol: true },
      });
      symbolList = allSymbols.map((h) => h.symbol);
    }

    const sentimentService = new SentimentAnalysisService(prisma);
    const riskService = new RiskAssessmentService(
      prisma,
      sentimentService
    );

    riskService.batchCalculate(symbolList);

    return NextResponse.json(
      {
        message: '批次計算已開始',
        symbolCount: symbolList.length,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error starting batch risk calculation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
