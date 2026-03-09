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
}

/**
 * CSV parse result
 */
export interface CSVParseResult {
  transactions: ParsedTransaction[]
  errors: Array<{ row: number; message: string }>
}

/**
 * CSV format type
 */
export type CSVFormat = 'schwab' | 'firstrade'

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

/**
 * Parse CSV content
 * 
 * @param csvContent - CSV file content as string
 * @param format - CSV format (schwab or firstrade)
 * @returns Parse result with transactions and errors
 */
export function parseCSV(csvContent: string, format: CSVFormat): CSVParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: Array<{ row: number; message: string }> = []

  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  // Process each row
  parseResult.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2 // +2 because index is 0-based and we skip header

    let result: ParsedTransaction | { error: string }
    
    if (format === 'schwab') {
      result = parseSchwabRow(row, rowNumber)
    } else {
      result = parseFirstradeRow(row, rowNumber)
    }

    if ('error' in result) {
      errors.push({ row: rowNumber, message: result.error })
    } else {
      transactions.push(result)
    }
  })

  return { transactions, errors }
}
