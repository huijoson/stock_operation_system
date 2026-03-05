import { NextRequest, NextResponse } from 'next/server';
import { DashboardNewsQueryService } from '@/services/dashboard-news.service';
import { DashboardNewsSyncService } from '@/services/dashboard-news-sync.service';
import { NEWS_CATEGORIES, type NewsCategory } from '@/types/news.types';

const DEFAULT_LIMIT = 5;
const CACHE_CONTROL_VALUE = 'public, max-age=300, stale-while-revalidate=3600';
const STALE_THRESHOLD_SECS = 15 * 60;
const ON_DEMAND_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const ENABLE_ON_DEMAND_SYNC =
  process.env.NODE_ENV !== 'test' &&
  process.env.DASHBOARD_NEWS_ON_DEMAND_SYNC !== 'false';
let lastOnDemandSyncAttemptAt = 0;

interface ErrorResponseBody {
  success: false;
  error: string;
  code: 'INVALID_INPUT' | 'INTERNAL_SERVER_ERROR';
}

function isNewsCategory(value: string): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory);
}

function shouldAttemptOnDemandSync(stalenessSecs: number | null): boolean {
  if (!ENABLE_ON_DEMAND_SYNC) {
    return false;
  }

  if (stalenessSecs !== null && stalenessSecs <= STALE_THRESHOLD_SECS) {
    return false;
  }

  const now = Date.now();
  if (now - lastOnDemandSyncAttemptAt < ON_DEMAND_SYNC_COOLDOWN_MS) {
    return false;
  }

  lastOnDemandSyncAttemptAt = now;
  return true;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = new URL(request.url).searchParams;
  const category = searchParams.get('category') ?? undefined;
  const cursor = searchParams.get('cursor') ?? undefined;
  const limitParam = searchParams.get('limit');
  const parsedLimit = limitParam === null ? DEFAULT_LIMIT : Number(limitParam);

  if (category && !isNewsCategory(category)) {
    const body: ErrorResponseBody = {
      success: false,
      error: 'category 參數不合法',
      code: 'INVALID_INPUT',
    };

    return NextResponse.json(body, { status: 400 });
  }

  const queryService = new DashboardNewsQueryService();

  try {
    let response = await queryService.query({
      category: category as NewsCategory | undefined,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT,
    });

    if (shouldAttemptOnDemandSync(response.data.meta.dataStalenessSecs)) {
      const syncService = new DashboardNewsSyncService();
      try {
        const syncResult = await syncService.run();
        if (syncResult.status === 'SUCCESS') {
          response = await queryService.query({
            category: category as NewsCategory | undefined,
            cursor,
            limit: Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT,
          });
        }
      } catch {
        // Keep serving cached data when on-demand sync fails.
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': CACHE_CONTROL_VALUE,
        'X-Data-Staleness-Seconds': String(response.data.meta.dataStalenessSecs ?? ''),
      },
    });
  } catch {
    const body: ErrorResponseBody = {
      success: false,
      error: '伺服器暫時無法處理請求，請稍後再試',
      code: 'INTERNAL_SERVER_ERROR',
    };
    return NextResponse.json(body, { status: 500 });
  }
}
