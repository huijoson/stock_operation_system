/**
 * Date filtering utilities for time period selection
 * Supports: 本月 (month), 本季 (quarter), 本年 (year), 全部 (all)
 */

export type TimePeriod = 'month' | 'quarter' | 'year' | 'all'

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Get date range for the specified time period
 */
export function getDateRangeForPeriod(period: TimePeriod = 'all'): DateRange {
  const now = new Date()
  const end = now

  switch (period) {
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end }
    }

    case 'quarter': {
      const currentMonth = now.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      const start = new Date(now.getFullYear(), quarterStartMonth, 1)
      return { start, end }
    }

    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end }
    }

    case 'all': {
      const start = new Date(0)
      return { start, end }
    }

    default:
      throw new Error(`Invalid time period: ${period}`)
  }
}

/**
 * Validate if a time period is valid
 */
export function isValidTimePeriod(period: string): period is TimePeriod {
  return ['month', 'quarter', 'year', 'all'].includes(period)
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
  const startStr = range.start.toISOString().split('T')[0]
  const endStr = range.end.toISOString().split('T')[0]
  return `${startStr} to ${endStr}`
}
