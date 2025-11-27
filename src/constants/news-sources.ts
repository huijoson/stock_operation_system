import { Credibility } from '@/types/insights'

export interface NewsSourceConfig {
  sourceName: string
  credibilityLevel: Credibility
  description?: string
}

export const DEFAULT_NEWS_SOURCES: NewsSourceConfig[] = [
  { sourceName: 'SEC', credibilityLevel: 'official', description: 'U.S. Securities and Exchange Commission' },
  { sourceName: 'BusinessWire', credibilityLevel: 'official', description: 'Official press releases' },
  { sourceName: 'PR Newswire', credibilityLevel: 'official', description: 'Official press releases' },
  { sourceName: 'Reuters', credibilityLevel: 'mainstream', description: 'International news agency' },
  { sourceName: 'Bloomberg', credibilityLevel: 'mainstream', description: 'Financial news and data' },
  { sourceName: 'CNBC', credibilityLevel: 'mainstream', description: 'Business news network' },
  { sourceName: 'Wall Street Journal', credibilityLevel: 'mainstream', description: 'Financial newspaper' },
  { sourceName: 'MarketWatch', credibilityLevel: 'mainstream', description: 'Financial information website' },
  { sourceName: 'Financial Times', credibilityLevel: 'mainstream', description: 'International business newspaper' },
]

export function getSourceCredibility(sourceName: string): Credibility {
  const source = DEFAULT_NEWS_SOURCES.find(
    (s) => s.sourceName.toLowerCase() === sourceName.toLowerCase()
  )
  return source?.credibilityLevel || 'unverified'
}
