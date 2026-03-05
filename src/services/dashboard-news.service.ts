/**
 * Dashboard News Query Service (Task T009)
 *
 * Reads news articles from the local DashboardNewsItem table.
 * Supports:
 *   - Category filtering (NewsCategory enum)
 *   - Limit clamping (1–50, default 5)
 *   - Cursor-based pagination (publishedAt DESC)
 *   - lastSyncedAt / dataStalenessSecs metadata
 *
 * This service NEVER calls external APIs — it reads only from the
 * local PostgreSQL database (SC-001 guarantee).
 *
 * References:
 *   - plan.md  §3 (GET /api/dashboard/news query params, response format)
 *   - data-model.md  §5 (data lifecycle)
 *   - contracts/dashboard-news.yaml  (NewsListResponse schema)
 */

import prisma from '@/lib/db/prisma';
import type {
  NewsCategory,
  NewsItemResponse,
  NewsListResponse,
} from '@/types/news.types';

// ── Constants ────────────────────────────────────────────────────────

/** Default number of items returned when `limit` is omitted. */
export const DEFAULT_LIMIT = 5;

/** Minimum allowed value for the `limit` parameter. */
export const MIN_LIMIT = 1;

/** Maximum allowed value for the `limit` parameter. */
export const MAX_LIMIT = 50;

const SERVICE_NAME = 'alpha-vantage';

// ── Query parameters ─────────────────────────────────────────────────

export interface QueryNewsParams {
  /** Filter by normalised category. Omit to return all categories. */
  category?: NewsCategory;
  /** Number of items to return (clamped to 1–50, default 5). */
  limit?: number;
  /** Cursor for pagination: ISO 8601 `publishedAt` of the last item on the previous page. */
  cursor?: string;
}

// ── Service ──────────────────────────────────────────────────────────

export class DashboardNewsQueryService {
  /**
   * Query news articles from the local database.
   *
   * @param params - Optional category, limit, and cursor.
   * @returns A `NewsListResponse` conforming to the OpenAPI contract.
   */
  async query(params: QueryNewsParams): Promise<NewsListResponse> {
    const {
      category,
      cursor,
    } = params;

    // ── 1. Clamp limit ─────────────────────────────────────────────
    const limit = clampLimit(params.limit);

    // ── 2. Build where clause ──────────────────────────────────────
    const where = buildWhereClause(category, cursor);

    // ── 3. Fetch limit + 1 items (to determine hasMore) ────────────
    const rows = await prisma.dashboardNewsItem.findMany({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        source: true,
        publishedAt: true,
        category: true,
      },
    });

    // ── 4. Determine pagination ────────────────────────────────────
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].publishedAt.toISOString()
      : null;

    // ── 5. Map to response DTOs ────────────────────────────────────
    const responseItems: NewsItemResponse[] = items.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: row.url,
      source: row.source,
      publishedAt: row.publishedAt.toISOString(),
      category: row.category as NewsCategory,
    }));

    // ── 6. Get lastSyncedAt from SyncQuotaLog ──────────────────────
    const syncLog = await prisma.syncQuotaLog.findFirst({
      where: {
        service: SERVICE_NAME,
        lastSyncAt: { not: null },
      },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    const lastSyncedAt = syncLog?.lastSyncAt ?? null;

    // ── 7. Calculate dataStalenessSecs ─────────────────────────────
    const dataStalenessSecs = lastSyncedAt
      ? Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000)
      : null;

    // ── 8. Assemble response ───────────────────────────────────────
    return {
      success: true,
      data: {
        items: responseItems,
        meta: {
          total: responseItems.length,
          hasMore,
          nextCursor,
          lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
          dataStalenessSecs,
        },
      },
    };
  }
}

// ── Private helpers ──────────────────────────────────────────────────

/**
 * Clamp the user-provided limit to [MIN_LIMIT, MAX_LIMIT].
 * Falls back to DEFAULT_LIMIT when undefined.
 */
function clampLimit(raw: number | undefined): number {
  if (raw === undefined) return DEFAULT_LIMIT;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(raw)));
}

/**
 * Build the Prisma `where` object from optional category and cursor.
 */
function buildWhereClause(
  category?: NewsCategory,
  cursor?: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }

  if (cursor) {
    where.publishedAt = { lt: new Date(cursor) };
  }

  return where;
}
