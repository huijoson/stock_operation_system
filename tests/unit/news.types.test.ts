import {
  CATEGORY_DISPLAY_NAME,
  NEWS_CATEGORIES,
  type DashboardNewsItemDto,
  type NewsCategory,
  type NewsListResponse,
} from '../../src/types/news.types'

describe('news.types', () => {
  it('exports all required categories in order', () => {
    expect(NEWS_CATEGORIES).toEqual([
      'General',
      'Technology',
      'Finance',
      'Earnings',
      'Mergers',
      'Other',
    ])
  })

  it('maps every category to a zh-TW display name', () => {
    const expected: Record<NewsCategory, string> = {
      General: '綜合',
      Technology: '科技',
      Finance: '金融',
      Earnings: '財報',
      Mergers: '併購',
      Other: '其他',
    }

    expect(CATEGORY_DISPLAY_NAME).toEqual(expected)
  })
})

// Compile-time DTO contract checks (validated by `npm run type-check`)
const _dto: DashboardNewsItemDto = {
  externalId: 'external-id-123',
  title: 'Sample title',
  summary: null,
  url: 'https://example.com/news',
  source: 'Reuters',
  publishedAt: new Date('2024-01-15T10:30:00.000Z'),
  category: 'Finance',
  rawTopics: ['finance'],
}

const _response: NewsListResponse = {
  success: true,
  data: {
    items: [
      {
        id: 'clxyz123abc456',
        title: 'Fed Signals Rate Cuts as Inflation Cools',
        summary: null,
        url: 'https://reuters.com/article/fed-rate-cuts-2024',
        source: 'Reuters',
        publishedAt: '2024-01-15T10:30:00.000Z',
        category: 'Finance',
      },
    ],
    meta: {
      total: 1,
      hasMore: false,
      nextCursor: null,
      lastSyncedAt: '2024-01-15T10:00:00.000Z',
      dataStalenessSecs: 1800,
    },
  },
}

void _dto
void _response
