import { NextRequest, NextResponse } from 'next/server';
import { DashboardNewsSyncService } from '@/services/dashboard-news-sync.service';

/**
 * POST /api/sync/dashboard-news
 *
 * Cron-triggered endpoint for syncing dashboard news from Alpha Vantage.
 * Called hourly by Vercel Cron (schedule: "0 * * * *").
 *
 * Security:
 *   - Requires `Authorization: Bearer {CRON_SECRET}` header.
 *   - Vercel Cron also sends `x-vercel-cron: 1` (informational; Bearer is authoritative).
 *
 * Responses:
 *   - 401 UNAUTHORIZED — missing / invalid credentials
 *   - 200 OK           — auth passed, sync delegated (T007/T008 will implement body)
 */

// ─── Auth helper ───────────────────────────────────────────────

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If the server has no CRON_SECRET configured, reject everything.
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return false;
  }

  const token = match[1];

  // Constant-time-ish comparison (good enough for serverless; not crypto-grade)
  if (token.length !== cronSecret.length) {
    return false;
  }

  // Simple byte-level comparison to avoid short-circuit timing leaks
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
  }

  return mismatch === 0;
}

// ─── Unauthorised response builder ─────────────────────────────

interface ErrorResponseBody {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'QUOTA_EXCEEDED' | 'UPSTREAM_UNAVAILABLE';
  retryAfter?: number;
}

function errorResponse(
  status: 401 | 429 | 503,
  error: string,
  code: ErrorResponseBody['code'],
  retryAfter?: number
): NextResponse {
  const body: ErrorResponseBody = {
    success: false,
    error,
    code,
    ...(retryAfter !== undefined ? { retryAfter } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers: retryAfter !== undefined ? { 'Retry-After': String(retryAfter) } : undefined,
  });
}

function unauthorizedResponse(): NextResponse {
  return errorResponse(401, '未授權的請求', 'UNAUTHORIZED');
}

function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1000));
}

// ─── Route handler ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Step 1: Verify cron authentication
  if (!verifyCronAuth(request)) {
    return unauthorizedResponse();
  }

  // Step 2: Execute sync flow
  const syncService = new DashboardNewsSyncService();
  let result: Awaited<ReturnType<DashboardNewsSyncService['run']>>;
  try {
    result = await syncService.run();
  } catch {
    return errorResponse(503, '無法連接至 Alpha Vantage API，將使用前次同步資料', 'UPSTREAM_UNAVAILABLE');
  }

  if (result.status === 'SUCCESS') {
    return NextResponse.json(
      {
        success: true,
        data: {
          upserted: result.upserted,
          skipped: result.skipped,
          quotaUsedToday: result.quotaUsedToday,
          quotaRemainingToday: result.quotaRemainingToday,
          syncedAt: result.syncedAt,
        },
      },
      { status: 200 }
    );
  }

  if (result.status === 'QUOTA_EXCEEDED') {
    const retryAfter = secondsUntilNextUtcMidnight();
    return errorResponse(
      429,
      '今日 Alpha Vantage API 配額已達上限（20/25），跳過本次同步',
      'QUOTA_EXCEEDED',
      retryAfter
    );
  }

  return errorResponse(503, '無法連接至 Alpha Vantage API，將使用前次同步資料', 'UPSTREAM_UNAVAILABLE');
}
