/**
 * Unit tests for src/lib/news-category-mapper.ts (Task T004)
 *
 * Covers:
 *  - mapTopicsToCategory(): mapping table, first-match semantics, unknown/empty → 'Other'
 *  - parseAlphaVantageTime(): format 'YYYYMMDDTHHmmss' → UTC Date
 *  - ALPHA_VANTAGE_TOPIC_MAP: exported mapping table completeness
 */
import {
  mapTopicsToCategory,
  parseAlphaVantageTime,
  ALPHA_VANTAGE_TOPIC_MAP,
} from '@/lib/news-category-mapper';

// ---------- mapTopicsToCategory ----------

describe('mapTopicsToCategory', () => {
  // --- Direct mapping hits ---

  it.each([
    [['technology'], 'Technology'],
    [['finance'], 'Finance'],
    [['earnings'], 'Earnings'],
    [['mergers_and_acquisitions'], 'Mergers'],
    [['ipo'], 'Finance'],
    [['blockchain'], 'Technology'],
    [['economy_fiscal'], 'General'],
    [['economy_monetary'], 'General'],
    [['economy_macro'], 'General'],
    [['energy_transportation'], 'General'],
    [['manufacturing'], 'General'],
    [['real_estate'], 'General'],
    [['retail_wholesale'], 'General'],
    [['life_sciences'], 'General'],
  ] as const)(
    'maps %j to %s',
    (topics, expected) => {
      expect(mapTopicsToCategory(topics as unknown as string[])).toBe(expected);
    },
  );

  // --- First-match semantics ---

  it('returns the category of the first matching topic when multiple are present', () => {
    // 'technology' → Technology (first match), 'earnings' → Earnings (ignored)
    expect(mapTopicsToCategory(['technology', 'earnings'])).toBe('Technology');
  });

  it('skips unknown topics and matches subsequent known topic', () => {
    expect(mapTopicsToCategory(['unknown_tag', 'finance'])).toBe('Finance');
  });

  it('skips multiple unknown topics until a known one is found', () => {
    expect(
      mapTopicsToCategory(['foo', 'bar', 'baz', 'blockchain']),
    ).toBe('Technology');
  });

  // --- Case insensitivity / trimming ---

  it('handles uppercase topic strings (case-insensitive)', () => {
    expect(mapTopicsToCategory(['TECHNOLOGY'])).toBe('Technology');
  });

  it('handles mixed-case topic strings', () => {
    expect(mapTopicsToCategory(['Mergers_And_Acquisitions'])).toBe('Mergers');
  });

  it('trims whitespace from topics', () => {
    expect(mapTopicsToCategory(['  finance  '])).toBe('Finance');
  });

  // --- Fallback to "Other" ---

  it('returns "Other" for empty topics array', () => {
    expect(mapTopicsToCategory([])).toBe('Other');
  });

  it('returns "Other" when all topics are unknown', () => {
    expect(mapTopicsToCategory(['crypto', 'nft', 'metaverse'])).toBe('Other');
  });

  it('returns "Other" for a single unknown topic', () => {
    expect(mapTopicsToCategory(['completely_unknown'])).toBe('Other');
  });
});

// ---------- ALPHA_VANTAGE_TOPIC_MAP ----------

describe('ALPHA_VANTAGE_TOPIC_MAP', () => {
  it('contains exactly 14 entries as defined in the spec', () => {
    expect(Object.keys(ALPHA_VANTAGE_TOPIC_MAP)).toHaveLength(14);
  });

  it('is frozen / readonly (no accidental mutations)', () => {
    // Attempting to add a key should not change the map
    const before = Object.keys(ALPHA_VANTAGE_TOPIC_MAP).length;
    try {
      (ALPHA_VANTAGE_TOPIC_MAP as Record<string, string>)['hacked'] = 'Other';
    } catch {
      // strict mode may throw; that's fine
    }
    expect(Object.keys(ALPHA_VANTAGE_TOPIC_MAP)).toHaveLength(before);
  });

  it('maps every value to a valid NewsCategory', () => {
    const valid = new Set(['General', 'Technology', 'Finance', 'Earnings', 'Mergers', 'Other']);
    for (const val of Object.values(ALPHA_VANTAGE_TOPIC_MAP)) {
      expect(valid).toContain(val);
    }
  });
});

// ---------- parseAlphaVantageTime ----------

describe('parseAlphaVantageTime', () => {
  it('parses standard Alpha Vantage time string to UTC Date', () => {
    const result = parseAlphaVantageTime('20240115T120000');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
  });

  it('parses midnight correctly', () => {
    const result = parseAlphaVantageTime('20240101T000000');
    expect(result.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('parses end-of-day time correctly', () => {
    const result = parseAlphaVantageTime('20231231T235959');
    expect(result.toISOString()).toBe('2023-12-31T23:59:59.000Z');
  });

  it('parses a mid-year date correctly', () => {
    const result = parseAlphaVantageTime('20240715T143022');
    expect(result.toISOString()).toBe('2024-07-15T14:30:22.000Z');
  });

  it('returns a Date object with correct individual components', () => {
    const result = parseAlphaVantageTime('20240315T091500');
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(2); // 0-indexed: March = 2
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(15);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it('returns Invalid Date for malformed input', () => {
    const result = parseAlphaVantageTime('not-a-date');
    expect(isNaN(result.getTime())).toBe(true);
  });

  it('returns Invalid Date for empty string', () => {
    const result = parseAlphaVantageTime('');
    expect(isNaN(result.getTime())).toBe(true);
  });
});
