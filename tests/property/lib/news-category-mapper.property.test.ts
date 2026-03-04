import fc from 'fast-check'

import {
  ALPHA_VANTAGE_TOPIC_MAP,
  mapTopicsToCategory,
} from '@/lib/news-category-mapper'
import { NEWS_CATEGORIES } from '@/types/news.types'

describe('mapTopicsToCategory property tests', () => {
  const knownTopics = new Set(Object.keys(ALPHA_VANTAGE_TOPIC_MAP))

  it('always returns a valid NewsCategory for arbitrary topics', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (topics) => {
        const category = mapTopicsToCategory(topics)
        expect(NEWS_CATEGORIES).toContain(category)
      }),
    )
  })

  it('returns Other for empty topics array', () => {
    expect(mapTopicsToCategory([])).toBe('Other')
  })

  it('returns Other for arrays containing only unknown values', () => {
    const unknownTopicArbitrary = fc
      .string()
      .filter((topic) => !knownTopics.has(topic.toLowerCase().trim()))

    fc.assert(
      fc.property(fc.array(unknownTopicArbitrary, { minLength: 1 }), (topics) => {
        expect(mapTopicsToCategory(topics)).toBe('Other')
      }),
    )
  })
})
