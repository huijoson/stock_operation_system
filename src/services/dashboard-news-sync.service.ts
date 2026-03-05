/**
 * Dashboard News Sync Service (Task T007)
 *
 * Orchestrates the hourly news synchronisation pipeline:
 *   STEP 1 — Quota check (soft limit 20 / hard limit 24)
 *   STEP 2 — Fetch articles from Alpha Vantage
 *   STEP 3 — Normalise raw articles → DashboardNewsItemDto
 *   STEP 4 — Upsert each DTO into DashboardNewsItem (idempotent via externalId)
 *   STEP 5 — Update SyncQuotaLog with callCount increment + lastSyncAt
 *
 * On upstream failure the service preserves existing DB data (SC-001a) and
 * records the error in `SyncQuotaLog.lastError`.
 *
 * References:
 *   - plan.md  §2.1 (flow diagram), §4 (rate-limit strategy)
 *   - data-model.md  §1.1 DashboardNewsItem, §1.2 SyncQuotaLog
 *   - contracts/dashboard-news.yaml  SyncSuccessResponse / ErrorResponse
 */

import { createHash } from 'crypto';

import prisma from '@/lib/db/prisma';
import {
  AlphaVantageClient,
  type AlphaVantageNewsItem,
} from '@/lib/api/alpha-vantage-client';
import {
  mapTopicsToCategory,
  parseAlphaVantageTime,
} from '@/lib/news-category-mapper';
import type { DashboardNewsItemDto } from '@/types/news.types';

// ── Constants ────────────────────────────────────────────────────────

/** Daily soft limit — beyond this the service returns QUOTA_EXCEEDED. */
export const SOFT_LIMIT = 20;

/** Daily hard limit — absolute ceiling (Alpha Vantage Free Tier = 25). */
export const HARD_LIMIT = 24;

const SERVICE_NAME = 'alpha-vantage';

// ── Result types ─────────────────────────────────────────────────────

export type SyncResultStatus = 'SUCCESS' | 'QUOTA_EXCEEDED' | 'UPSTREAM_UNAVAILABLE';

export interface SyncResult {
  status: SyncResultStatus;
  upserted: number;
  skipped: number;
  quotaUsedToday: number;
  quotaRemainingToday: number;
  syncedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Generate a deterministic external ID for a news article URL.
 * Uses SHA-256, truncated to 32 hex characters.
 */
export function generateExternalId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

/**
 * Get the current UTC date as 'YYYY-MM-DD'.
 * Extracted so that it could be overridden in tests if needed.
 */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Service ──────────────────────────────────────────────────────────

export class DashboardNewsSyncService {
  private readonly client: AlphaVantageClient;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY ?? '';
    this.client = new AlphaVantageClient(apiKey);
  }

  /**
   * Execute the full synchronisation pipeline.
   *
   * @returns A `SyncResult` with status, counts, and quota info.
   */
  async run(): Promise<SyncResult> {
    const today = todayUTC();
    const now = new Date();

    // ── STEP 1: Quota check ────────────────────────────────────────
    const quotaLog = await prisma.syncQuotaLog.upsert({
      where: { date_service: { date: today, service: SERVICE_NAME } },
      update: {},                                // no-op — just read
      create: { date: today, service: SERVICE_NAME, callCount: 0 },
    });

    if (quotaLog.callCount >= SOFT_LIMIT) {
      // Record lastError for monitoring (T012: consistent lastError recording)
      await prisma.syncQuotaLog.update({
        where: { date_service: { date: today, service: SERVICE_NAME } },
        data: {
          lastError: `今日 API 配額已達上限（${quotaLog.callCount}/${HARD_LIMIT + 1}），跳過同步`,
        },
      });

      return {
        status: 'QUOTA_EXCEEDED',
        upserted: 0,
        skipped: 0,
        quotaUsedToday: quotaLog.callCount,
        quotaRemainingToday: Math.max(0, SOFT_LIMIT - quotaLog.callCount),
        syncedAt: now.toISOString(),
      };
    }

    // ── STEP 2: Fetch from Alpha Vantage ───────────────────────────
    let rawArticles: AlphaVantageNewsItem[];
    try {
      rawArticles = await this.client.getNewsSentiment();
    } catch (error) {
      // Record zh-TW error with raw detail for debugging (T012: zh-TW lastError)
      const rawDetail = error instanceof Error ? error.message : String(error);
      const lastError = `上游 Alpha Vantage API 不可用：${rawDetail}`;
      await prisma.syncQuotaLog.update({
        where: { date_service: { date: today, service: SERVICE_NAME } },
        data: {
          callCount: { increment: 1 },
          lastError,
        },
      });

      return {
        status: 'UPSTREAM_UNAVAILABLE',
        upserted: 0,
        skipped: 0,
        quotaUsedToday: quotaLog.callCount + 1,
        quotaRemainingToday: Math.max(0, SOFT_LIMIT - (quotaLog.callCount + 1)),
        syncedAt: now.toISOString(),
      };
    }

    // ── STEP 3: Normalise ──────────────────────────────────────────
    const dtos: DashboardNewsItemDto[] = [];
    let skipped = 0;

    for (const article of rawArticles) {
      const dto = this.normaliseArticle(article);
      if (dto === null) {
        skipped++;
        continue;
      }
      dtos.push(dto);
    }

    // ── STEP 4: Upsert ────────────────────────────────────────────
    const syncedAt = new Date();
    let upserted = 0;

    for (const dto of dtos) {
      await prisma.dashboardNewsItem.upsert({
        where: { externalId: dto.externalId },
        update: { syncedAt },
        create: {
          externalId: dto.externalId,
          title: dto.title,
          summary: dto.summary,
          url: dto.url,
          source: dto.source,
          publishedAt: dto.publishedAt,
          category: dto.category,
          rawTopics: dto.rawTopics,
          syncedAt,
        },
      });
      upserted++;
    }

    // ── STEP 5: Update quota & return ──────────────────────────────
    await prisma.syncQuotaLog.update({
      where: { date_service: { date: today, service: SERVICE_NAME } },
      data: {
        callCount: { increment: 1 },
        lastSyncAt: syncedAt,
        lastError: null,           // Clear previous error on success
      },
    });

    const quotaUsedToday = quotaLog.callCount + 1;

    return {
      status: 'SUCCESS',
      upserted,
      skipped,
      quotaUsedToday,
      quotaRemainingToday: Math.max(0, SOFT_LIMIT - quotaUsedToday),
      syncedAt: syncedAt.toISOString(),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Normalise a single Alpha Vantage article into a `DashboardNewsItemDto`.
   * Returns `null` if the article fails validation (skip it).
   *
   * Validation rules (from data-model.md §4):
   *   - title: non-empty, ≤ 500 chars (truncate if longer)
   *   - url: non-empty, starts with `https://`
   *   - publishedAt: must be a valid Date (not NaN)
   *   - source: non-empty (fallback handled by AlphaVantageClient already)
   */
  private normaliseArticle(article: AlphaVantageNewsItem): DashboardNewsItemDto | null {
    // ── Validate URL ──
    if (!article.url || !article.url.startsWith('https://')) {
      return null;
    }

    // ── Validate title ──
    if (!article.title) {
      return null;
    }

    // ── Parse & validate publishedAt ──
    const publishedAt = parseAlphaVantageTime(article.timePublished);
    if (isNaN(publishedAt.getTime())) {
      return null;
    }

    // ── Build DTO ──
    return {
      externalId: generateExternalId(article.url),
      title: article.title.length > 500 ? article.title.slice(0, 500) : article.title,
      summary: article.summary,
      url: article.url,
      source: article.source || 'Unknown Source',
      publishedAt,
      category: mapTopicsToCategory(article.topics),
      rawTopics: article.topics,
    };
  }
}
