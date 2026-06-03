import Papa from 'papaparse'
import Decimal from 'decimal.js'

/**
 * Parsed transaction from CSV
 */
export interface ParsedTransaction {
  date: Date
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Decimal
  price: Decimal
  externalId?: string
}

/**
 * CSV parse result
 */
export interface CSVParseResult {
  transactions: ParsedTransaction[]
  errors: Array<{ row: number; message: string }>
  skippedCount: number
}

/**
 * CSV format type
 */
export type CSVFormat = 'schwab' | 'firstrade' | 'schwab-zh' | 'firstrade-zh'

/**
 * Parse Schwab format CSV
 * Format: Date,Action,Symbol,Quantity,Price
 * Date format: YYYY-MM-DD
 * Action: Buy or Sell
 */
function parseSchwabRow(row: any, rowIndex: number): ParsedTransaction | { error: string } {
  try {
    const { Date: dateStr, Action, Symbol, Quantity, Price } = row

    // Validate required fields
    if (!dateStr || !Action || !Symbol || !Quantity || !Price) {
      return { error: 'Missing required fields' }
    }

    // Parse date (YYYY-MM-DD)
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    // Parse action
    const type = Action.toLowerCase() === 'buy' ? 'BUY' : Action.toLowerCase() === 'sell' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }


    // Parse quantity
    const quantity = new Decimal(Quantity)
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    // Parse price
    const price = new Decimal(Price)
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    return {
      date,
      symbol: Symbol.trim(),
      type,
      quantity,
      price,
    }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Parse Firstrade format CSV
 * Format: Date,Symbol,Action,Quantity,Price
 * Date format: MM/DD/YYYY
 * Action: Bought or Sold
 */
function parseFirstradeRow(row: any, rowIndex: number): ParsedTransaction | { error: string } {
  try {
    const { Date: dateStr, Symbol, Action, Quantity, Price } = row

    // Validate required fields
    if (!dateStr || !Symbol || !Action || !Quantity || !Price) {
      return { error: 'Missing required fields' }
    }

    // Parse date (MM/DD/YYYY)
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    // Parse action
    const type = Action.toLowerCase() === 'bought' ? 'BUY' : Action.toLowerCase() === 'sold' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }

    // Parse quantity
    const quantity = new Decimal(Quantity)
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    // Parse price
    const price = new Decimal(Price)
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    return {
      date,
      symbol: Symbol.trim(),
      type,
      quantity,
      price,
    }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/** 解析 YYYY/M/D 為 UTC 當日午夜，避免時區位移 */
function parseSlashDateUTC(s: string): Date | null {
  const m = String(s).trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/**
 * Parse Schwab 中文成交明細
 * 表頭: 日期,交易類別,數量,說明,代號,賬戶類別,價格,金額
 */
function parseSchwabZhRow(row: any): ParsedTransaction | { error: string } {
  try {
    const dateStr = row['日期']
    const action = row['交易類別']
    const quantityStr = row['數量']
    const symbol = row['代號']
    const priceStr = row['價格']

    if (!dateStr || !action || quantityStr == null || quantityStr === '' || !symbol || !priceStr) {
      return { error: 'Missing required fields' }
    }

    const date = parseSlashDateUTC(dateStr)
    if (!date || isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    const type = action === '買進' ? 'BUY' : action === '賣出' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }

    const quantity = new Decimal(String(quantityStr).replace(/,/g, '')).abs()
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    const price = new Decimal(String(priceStr).replace(/,/g, ''))
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    return { date, symbol: String(symbol).trim(), type, quantity, price }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/** 解析 "1:00 PM 06/02/2026" 中的 MM/DD/YYYY 為 UTC 當日（不做時區換算，僅取日） */
function parseFirstradeDateTimeUTC(s: string): Date | null {
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])))
}

/**
 * Parse Firstrade 中文訂單狀態
 * 表頭: 代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,
 *       成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
 * 僅匯入「已成交」；其餘狀態與無成交價者視為 skip。
 */
function parseFirstradeZhRow(row: any): ParsedTransaction | { error: string } | { skip: string } {
  try {
    const status = row['狀態']
    if (status !== '已成交') {
      return { skip: `status=${status ?? 'unknown'}` }
    }

    const symbol = row['代號']
    const action = row['行動']
    const qtyRaw = row['數量|面值']
    const execPrice = row['成交價格']
    const dateTime = row['時間和日期（美東時間）']

    if (!symbol || !action || !qtyRaw || !dateTime) {
      return { error: 'Missing required fields' }
    }

    const type = action === '買入' ? 'BUY' : action === '賣出' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }

    const qtyMatch = String(qtyRaw).match(/[\d.,]+/)
    if (!qtyMatch) {
      return { error: 'Invalid quantity' }
    }
    const quantity = new Decimal(qtyMatch[0].replace(/,/g, '')).abs()
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    const priceClean = String(execPrice ?? '').replace(/[$,\s]/g, '')
    if (!priceClean || priceClean === '-') {
      return { skip: 'no execution price' }
    }
    const price = new Decimal(priceClean)
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    const date = parseFirstradeDateTimeUTC(dateTime)
    if (!date || isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    const orderId = row['訂單號碼'] ? String(row['訂單號碼']).trim() : undefined

    return { date, symbol: String(symbol).trim(), type, quantity, price, externalId: orderId }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Parse CSV content
 *
 * @param csvContent - CSV file content as string
 * @param format - CSV format
 * @returns Parse result with transactions, errors and skipped count
 */
export function parseCSV(csvContent: string, format: CSVFormat): CSVParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: Array<{ row: number; message: string }> = []
  let skippedCount = 0

  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  // Process each row
  parseResult.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2 // +2 because index is 0-based and we skip header

    let result: ParsedTransaction | { error: string } | { skip: string }

    if (format === 'schwab') {
      result = parseSchwabRow(row, rowNumber)
    } else if (format === 'firstrade') {
      result = parseFirstradeRow(row, rowNumber)
    } else if (format === 'schwab-zh') {
      result = parseSchwabZhRow(row)
    } else {
      result = parseFirstradeZhRow(row)
    }

    if ('error' in result) {
      errors.push({ row: rowNumber, message: result.error })
    } else if ('skip' in result) {
      skippedCount++
    } else {
      transactions.push(result)
    }
  })

  return { transactions, errors, skippedCount }
}
