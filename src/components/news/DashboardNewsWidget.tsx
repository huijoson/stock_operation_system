'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { NewsErrorState } from '@/components/news/NewsErrorState'
import { NewsLoadingState } from '@/components/news/NewsLoadingState'
import {
  CATEGORY_DISPLAY_NAME,
  type NewsCategory,
  type NewsItemResponse,
  type NewsListResponse,
} from '@/types/news.types'

type FilterValue = 'ALL' | NewsCategory

interface ErrorResponse {
  success: false
  error: string
}

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'General', label: CATEGORY_DISPLAY_NAME.General },
  { value: 'Technology', label: CATEGORY_DISPLAY_NAME.Technology },
  { value: 'Finance', label: CATEGORY_DISPLAY_NAME.Finance },
  { value: 'Earnings', label: CATEGORY_DISPLAY_NAME.Earnings },
  { value: 'Mergers', label: CATEGORY_DISPLAY_NAME.Mergers },
  { value: 'Other', label: CATEGORY_DISPLAY_NAME.Other },
]

function formatPublishedTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatStaleness(seconds: number): string {
  if (seconds <= 0) {
    return '剛剛更新'
  }

  const mins = Math.floor(seconds / 60)
  if (mins < 1) {
    return '1 分鐘內更新'
  }

  if (mins < 60) {
    return `${mins} 分鐘前更新`
  }

  const hours = Math.floor(mins / 60)
  return `${hours} 小時前更新`
}

export default function DashboardNewsWidget() {
  const [items, setItems] = useState<NewsItemResponse[]>([])
  const [selectedCategory, setSelectedCategory] = useState<FilterValue>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataStalenessSecs, setDataStalenessSecs] = useState(0)

  const newsApiUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '5' })

    if (selectedCategory !== 'ALL') {
      params.set('category', selectedCategory)
    }

    return `/api/dashboard/news?${params.toString()}`
  }, [selectedCategory])

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(newsApiUrl, {
        credentials: 'include',
        cache: 'no-store',
      })

      const payload = (await response.json()) as NewsListResponse | ErrorResponse

      if (!response.ok || !('success' in payload) || payload.success === false) {
        setError('新聞載入失敗，請稍後再試')
        setItems([])
        return
      }

      setItems(payload.data.items)
      setDataStalenessSecs(payload.data.meta.dataStalenessSecs)
    } catch (err) {
      setError('新聞載入失敗，請稍後再試')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [newsApiUrl])

  useEffect(() => {
    fetchNews()

    // Auto-refresh every 5 minutes to keep news up-to-date
    const intervalId = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [fetchNews])

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">股市消息</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {formatStaleness(dataStalenessSecs)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => {
              const active = option.value === selectedCategory

              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedCategory(option.value)}
                  className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {loading && <NewsLoadingState />}

        {!loading && error && <NewsErrorState message={error} onRetry={fetchNews} />}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            目前尚無新聞資料
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    {CATEGORY_DISPLAY_NAME[item.category]}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatPublishedTime(item.publishedAt)}</span>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-300 line-clamp-2"
                >
                  {item.title}
                </a>

                {item.summary && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{item.summary}</p>
                )}

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  來源：{item.source || 'Unknown Source'}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
