/**
 * Manual sync script for local/VM environments where Vercel Cron is unavailable.
 *
 * Usage:
 *   npx tsx scripts/sync-dashboard-news.ts
 *
 * Requires:
 *   - DATABASE_URL in .env
 *   - ALPHA_VANTAGE_API_KEY in .env
 */

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

const SERVICE_NAME = 'alpha-vantage'
const SOFT_LIMIT = 20

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    console.error('❌ ALPHA_VANTAGE_API_KEY 未設定')
    process.exit(1)
  }

  const today = todayUTC()

  // Quota check
  const quotaLog = await prisma.syncQuotaLog.upsert({
    where: { date_service: { date: today, service: SERVICE_NAME } },
    update: {},
    create: { date: today, service: SERVICE_NAME, callCount: 0 },
  })

  if (quotaLog.callCount >= SOFT_LIMIT) {
    console.warn(`⚠️  今日配額已用 ${quotaLog.callCount}/${SOFT_LIMIT}，跳過同步`)
    return
  }

  // Fetch from Alpha Vantage
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'NEWS_SENTIMENT')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('limit', '50')
  url.searchParams.set('sort', 'LATEST')

  console.log('🔄 正在從 Alpha Vantage 取得新聞…')
  const res = await fetch(url.toString())
  if (!res.ok) {
    console.error(`❌ Alpha Vantage 回傳 ${res.status}`)
    process.exit(1)
  }

  const payload = (await res.json()) as { feed?: Array<Record<string, unknown>> }
  const feed = Array.isArray(payload.feed) ? payload.feed : []
  console.log(`📰 取得 ${feed.length} 篇文章`)

  const syncedAt = new Date()
  let upserted = 0

  for (const item of feed) {
    const itemUrl = typeof item.url === 'string' ? item.url : ''
    const title = typeof item.title === 'string' ? item.title : ''
    if (!itemUrl || !itemUrl.startsWith('https://') || !title) continue

    const externalId = createHash('sha256').update(itemUrl).digest('hex').slice(0, 32)
    const timePublished = typeof item.time_published === 'string' ? item.time_published : ''
    const publishedAt = parseAlphaVantageTime(timePublished)
    if (isNaN(publishedAt.getTime())) continue

    const topics = Array.isArray(item.topics)
      ? (item.topics as Array<{ topic?: string }>)
          .map((t) => (typeof t.topic === 'string' ? t.topic : ''))
          .filter(Boolean)
      : []

    await prisma.dashboardNewsItem.upsert({
      where: { externalId },
      update: { syncedAt },
      create: {
        externalId,
        title: title.slice(0, 500),
        summary: typeof item.summary === 'string' ? item.summary : null,
        url: itemUrl,
        source: typeof item.source === 'string' && item.source.trim() ? item.source : 'Unknown Source',
        publishedAt,
        category: 'General',
        rawTopics: topics,
        syncedAt,
      },
    })
    upserted++
  }

  // Update quota
  await prisma.syncQuotaLog.update({
    where: { date_service: { date: today, service: SERVICE_NAME } },
    data: {
      callCount: { increment: 1 },
      lastSyncAt: syncedAt,
      lastError: null,
    },
  })

  console.log(`✅ 同步完成：upserted=${upserted}，quota=${quotaLog.callCount + 1}/${SOFT_LIMIT}`)
}

function parseAlphaVantageTime(raw: string): Date {
  // Alpha Vantage format: "20250101T120000"
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (!match) return new Date(raw)
  const [, y, m, d, h, min, s] = match
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`)
}

main()
  .catch((err) => {
    console.error('❌ 同步失敗：', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
