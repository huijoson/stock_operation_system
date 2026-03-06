import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';
import { RiskAssessmentService } from '@/services/risk-assessment.service';
import { SentimentAnalysisService } from '@/services/sentiment-analysis.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { portfolioId } = await params;

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sentimentService = new SentimentAnalysisService(prisma);
    const riskService = new RiskAssessmentService(
      prisma,
      sentimentService
    );

    const summary = await riskService.getPortfolioRiskAssessments(portfolioId);

    const riskLevelLabels = {
      low: '低風險',
      medium: '中風險',
      high: '高風險',
    };

    const response = {
      portfolioId: summary.portfolioId,
      portfolioName: summary.portfolioName,
      overallRisk: summary.overallRisk,
      overallRiskLabel: riskLevelLabels[summary.overallRisk],
      holdings: summary.holdings.map((h) => ({
        symbol: h.symbol,
        riskScore: h.riskScore,
        riskLevel: h.riskLevel,
        riskLevelLabel: riskLevelLabels[h.riskLevel],
        marketValue: h.marketValue,
      })),
      highRiskCount: summary.highRiskCount,
      mediumRiskCount: summary.mediumRiskCount,
      lowRiskCount: summary.lowRiskCount,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching portfolio risk assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
