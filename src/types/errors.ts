/**
 * Error codes for the application
 * Based on the design document error handling section
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_PORTFOLIO_NAME = 'INVALID_PORTFOLIO_NAME',

  // Business logic errors
  INSUFFICIENT_HOLDINGS = 'INSUFFICIENT_HOLDINGS',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  PORTFOLIO_NOT_FOUND = 'PORTFOLIO_NOT_FOUND',

  // External service errors
  STOCK_API_ERROR = 'STOCK_API_ERROR',
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',

  // File processing errors
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',

  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Application error interface
 */
export interface AppError {
  code: ErrorCode
  message: string
  details?: any
}

/**
 * Custom error class for application errors
 */
export class ApplicationError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: any

  constructor(code: ErrorCode, message: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError)
    }
  }
}

/**
 * Factory functions for common errors
 */
export const ErrorFactory = {
  invalidCredentials: () =>
    new ApplicationError(
      ErrorCode.INVALID_CREDENTIALS,
      '電子郵件或密碼錯誤',
      401
    ),

  sessionExpired: () =>
    new ApplicationError(
      ErrorCode.SESSION_EXPIRED,
      '登入已過期，請重新登入',
      401
    ),

  unauthorized: () =>
    new ApplicationError(
      ErrorCode.UNAUTHORIZED,
      '未授權的存取',
      401
    ),

  invalidInput: (message: string, details?: any) =>
    new ApplicationError(
      ErrorCode.INVALID_INPUT,
      message,
      400,
      details
    ),

  duplicateEmail: () =>
    new ApplicationError(
      ErrorCode.DUPLICATE_EMAIL,
      '此電子郵件已被註冊',
      409
    ),

  invalidPortfolioName: () =>
    new ApplicationError(
      ErrorCode.INVALID_PORTFOLIO_NAME,
      '投資組合名稱不可為空白',
      400
    ),

  insufficientHoldings: (symbol: string, available: number, requested: number) =>
    new ApplicationError(
      ErrorCode.INSUFFICIENT_HOLDINGS,
      `持股數量不足：${symbol} 可賣出 ${available} 股，但嘗試賣出 ${requested} 股`,
      422,
      { symbol, available, requested }
    ),

  invalidTransaction: (message: string) =>
    new ApplicationError(
      ErrorCode.INVALID_TRANSACTION,
      message,
      422
    ),

  portfolioNotFound: (id: string) =>
    new ApplicationError(
      ErrorCode.PORTFOLIO_NOT_FOUND,
      `找不到投資組合：${id}`,
      404,
      { portfolioId: id }
    ),

  stockApiError: (message: string) =>
    new ApplicationError(
      ErrorCode.STOCK_API_ERROR,
      `股價資料服務錯誤：${message}`,
      503
    ),

  stockNotFound: (symbol: string) =>
    new ApplicationError(
      ErrorCode.STOCK_NOT_FOUND,
      `找不到股票：${symbol}`,
      404,
      { symbol }
    ),

  csvParseError: (message: string, details?: any) =>
    new ApplicationError(
      ErrorCode.CSV_PARSE_ERROR,
      `CSV 解析錯誤：${message}`,
      400,
      details
    ),

  invalidFileFormat: (message: string) =>
    new ApplicationError(
      ErrorCode.INVALID_FILE_FORMAT,
      message,
      400
    ),

  databaseError: (message: string) =>
    new ApplicationError(
      ErrorCode.DATABASE_ERROR,
      '資料庫操作失敗',
      500,
      { originalMessage: message }
    ),

  internalError: (message: string) =>
    new ApplicationError(
      ErrorCode.INTERNAL_ERROR,
      '系統內部錯誤',
      500,
      { originalMessage: message }
    ),
}
