/**
 * Alpha Vantage topic → NewsCategory mapping and time-parsing utilities.
 *
 * Task T004 — specs/002-dashboard-stock-news
 */

import type { NewsCategory } from '../types/news.types';

// ── Mapping table ────────────────────────────────────────────────────

/**
 * Alpha Vantage `topics[].topic` → `NewsCategory` static mapping.
 *
 * Source of truth: plan.md §分類映射完整表 + data-model.md §3.
 */
export const ALPHA_VANTAGE_TOPIC_MAP: Readonly<Record<string, NewsCategory>> = Object.freeze({
  technology:               'Technology',
  finance:                  'Finance',
  earnings:                 'Earnings',
  mergers_and_acquisitions: 'Mergers',
  ipo:                      'Finance',
  blockchain:               'Technology',
  economy_fiscal:           'General',
  economy_monetary:         'General',
  economy_macro:            'General',
  energy_transportation:    'General',
  manufacturing:            'General',
  real_estate:              'General',
  retail_wholesale:         'General',
  life_sciences:            'General',
});

// ── mapTopicsToCategory ──────────────────────────────────────────────

/**
 * Map an array of Alpha Vantage topic strings to a single `NewsCategory`.
 *
 * Strategy: iterate `topics` in order and return the category of the
 * **first** topic that has a mapping entry.  If no topic matches (or the
 * array is empty), return `'Other'`.
 *
 * Topics are normalised to lower-case and trimmed before lookup.
 *
 * @param topics — raw `topics[].topic` values from the Alpha Vantage feed
 * @returns the resolved `NewsCategory`
 */
export function mapTopicsToCategory(topics: string[]): NewsCategory {
  for (const topic of topics) {
    const normalised = topic.toLowerCase().trim();
    if (Object.hasOwn(ALPHA_VANTAGE_TOPIC_MAP, normalised)) {
      return ALPHA_VANTAGE_TOPIC_MAP[normalised];
    }
  }
  return 'Other';
}

// ── parseAlphaVantageTime ────────────────────────────────────────────

/**
 * Parse the Alpha Vantage `time_published` string into a UTC `Date`.
 *
 * Input format: `'YYYYMMDDTHHmmss'`  (e.g. `'20240115T120000'`)
 * Output:       `Date('2024-01-15T12:00:00.000Z')`
 *
 * If the input is malformed or too short the standard `Date` constructor
 * will return an Invalid Date — callers should validate via `isNaN()`.
 *
 * @param timePublished — raw time string from Alpha Vantage
 * @returns UTC Date
 */
export function parseAlphaVantageTime(timePublished: string): Date {
  // '20240115T120000' → '2024-01-15T12:00:00Z'
  const formatted =
    `${timePublished.slice(0, 4)}-${timePublished.slice(4, 6)}-${timePublished.slice(6, 8)}` +
    `T${timePublished.slice(9, 11)}:${timePublished.slice(11, 13)}:${timePublished.slice(13, 15)}Z`;
  return new Date(formatted);
}
