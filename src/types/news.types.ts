export type NewsCategory =
  | 'General'
  | 'Technology'
  | 'Finance'
  | 'Earnings'
  | 'Mergers'
  | 'Other'

export const NEWS_CATEGORIES: NewsCategory[] = [
  'General',
  'Technology',
  'Finance',
  'Earnings',
  'Mergers',
  'Other',
]

export const CATEGORY_DISPLAY_NAME: Record<NewsCategory, string> = {
  General: '綜合',
  Technology: '科技',
  Finance: '金融',
  Earnings: '財報',
  Mergers: '併購',
  Other: '其他',
}

export interface DashboardNewsItemDto {
  externalId: string
  title: string
  summary: string | null
  url: string
  source: string
  publishedAt: Date
  category: NewsCategory
  rawTopics: string[]
}

export interface NewsItemResponse {
  id: string
  title: string
  summary: string | null
  url: string
  source: string
  publishedAt: string
  category: NewsCategory
}

export interface NewsListResponse {
  success: true
  data: {
    items: NewsItemResponse[]
    meta: {
      total: number
      hasMore: boolean
      nextCursor: string | null
      lastSyncedAt: string | null
      dataStalenessSecs: number
    }
  }
}
