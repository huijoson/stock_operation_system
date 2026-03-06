import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CredibilityService } from '@/services/credibility.service';

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  try {
    const service = new CredibilityService(prisma);
    const ratings = await service.getAllSourceRatings();

    const grouped = {
      official: ratings.filter((r) => r.credibilityLevel === 'official'),
      mainstream: ratings.filter((r) => r.credibilityLevel === 'mainstream'),
      unverified: ratings.filter((r) => r.credibilityLevel === 'unverified'),
    };

    return NextResponse.json({
      success: true,
      data: {
        sources: ratings,
        grouped,
      },
    });
  } catch (error) {
    console.error('取得新聞來源評等失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取得新聞來源評等失敗',
      },
      { status: 500 }
    );
  }
}
