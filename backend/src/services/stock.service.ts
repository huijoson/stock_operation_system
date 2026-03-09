import { PrismaClient } from '@prisma/client'
import prisma from '../lib/prisma'
import Decimal from 'decimal.js'
import axios from 'axios'
import https from 'https'
import { indicatorCacheService } from './indicator-cache.service'

/**
 * StockService handles stock price data retrieval and caching
 * Integrates with external APIs (Yahoo Finance) and manages price cache
 * 
 * Requirements: 11.3 - Automatically invalidates indicator cache when price data is updated
 */
export class StockService {
  private prisma: PrismaClient
  private cacheValidityHours: number = 1 // Cache validity period in hours

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma
  }

  /**
   * Get current stock price from external API
   * 
   * @param symbol - Stock symbol
   * @returns Current price as Decimal
   * @throws Error if stock not found or API error
   */
  async getCurrentPrice(symbol: string): Promise<Decimal> {
    // Validate symbol
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Stock symbol cannot be empty')
    }

    try {
      // Try to get from cache first
      const cachedPrice = await this.getCachedPrice(symbol)
      const cacheValid = await this.isCacheValid(symbol)
      if (cachedPrice && cacheValid) {
        return cachedPrice
      }

      // Fetch from external API
      const price = await this.fetchPriceFromAPI(symbol)

      // Cache the price
      await this.cachePrice(symbol, price)

      return price
    } catch (error) {
      // Try to use cached data as fallback
      const cachedPrice = await this.getCachedPrice(symbol)
      if (cachedPrice) {
        console.warn(`Using cached price for ${symbol} due to API error`)
        return cachedPrice
      }

      // No cache available, throw error
      throw new Error(`Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get historical stock prices for a date range
   * 
   * @param symbol - Stock symbol
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of historical prices
   */
  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; price: Decimal }>> {
    // Validate inputs
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Stock symbol cannot be empty')
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date')
    }

    try {
      // Try to get from cache first
      const cachedPrices = await this.prisma.stockPrice.findMany({
        where: {
          symbol,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      })

      // If we have complete cached data, return it
      if (cachedPrices.length > 0) {
        return cachedPrices.map(p => ({
          date: p.date,
          price: new Decimal(p.price.toString()),
        }))
      }

      // Otherwise, fetch from API
      const prices = await this.fetchHistoricalPricesFromAPI(symbol, startDate, endDate)

      // Cache the prices
      for (const priceData of prices) {
        await this.cachePrice(symbol, priceData.price, priceData.date)
      }

      return prices
    } catch (error) {
      // Try to use cached data as fallback
      const cachedPrices = await this.prisma.stockPrice.findMany({
        where: {
          symbol,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      })

      if (cachedPrices.length > 0) {
        console.warn(`Using cached historical prices for ${symbol} due to API error`)
        return cachedPrices.map(p => ({
          date: p.date,
          price: new Decimal(p.price.toString()),
        }))
      }

      throw new Error(`Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get cached price for a stock symbol
   * 
   * @param symbol - Stock symbol
   * @returns Cached price or null if not found
   */
  async getCachedPrice(symbol: string): Promise<Decimal | null> {
    const cachedPrice = await this.prisma.stockPrice.findFirst({
      where: { symbol },
      orderBy: { date: 'desc' },
    })

    if (!cachedPrice) {
      return null
    }

    return new Decimal(cachedPrice.price.toString())
  }

  /**
   * Cache a stock price
   * 
   * When price data is updated, automatically invalidates all cached indicators
   * for this stock to ensure indicators are recalculated with the latest data.
   * 
   * @param symbol - Stock symbol
   * @param price - Price to cache
   * @param date - Date of the price (defaults to now)
   * 
   * Requirements: 11.3
   * Property 24: Cache invalidation mechanism
   */
  async cachePrice(symbol: string, price: Decimal, date?: Date): Promise<void> {
    const priceDate = date || new Date()

    // Normalize date to start of day for consistency
    const normalizedDate = new Date(priceDate)
    normalizedDate.setHours(0, 0, 0, 0)

    await this.prisma.stockPrice.upsert({
      where: {
        symbol_date: {
          symbol,
          date: normalizedDate,
        },
      },
      create: {
        symbol,
        price: price.toFixed(8),
        date: normalizedDate,
      },
      update: {
        price: price.toFixed(8),
      },
    })

    // Invalidate all indicator cache for this symbol when price data is updated
    // This ensures indicators are recalculated with the latest price data
    await indicatorCacheService.invalidate(symbol)
  }

  /**
   * Check if cached price is still valid
   * 
   * @param symbol - Stock symbol
   * @returns True if cache is valid
   */
  private async isCacheValid(symbol: string): Promise<boolean> {
    const cachedPrice = await this.prisma.stockPrice.findFirst({
      where: { symbol },
      orderBy: { createdAt: 'desc' },
    })

    if (!cachedPrice) {
      return false
    }

    const now = new Date()
    const cacheAge = now.getTime() - cachedPrice.createdAt.getTime()
    const maxAge = this.cacheValidityHours * 60 * 60 * 1000 // Convert hours to milliseconds

    return cacheAge < maxAge
  }

  /**
   * Fetch current price from external API (Yahoo Finance)
   * 
   * @param symbol - Stock symbol
   * @returns Current price
   */
  private async fetchPriceFromAPI(symbol: string): Promise<Decimal> {
    try {
      // Use Yahoo Finance API v8
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
      
      // Create axios instance with SSL verification disabled (for development only)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      const response = await axios.get(url, {
        params: {
          interval: '1d',
          range: '1d',
        },
        timeout: 10000, // 10 second timeout
        httpsAgent,
      })

      // Parse response
      const result = response.data?.chart?.result?.[0]
      if (!result) {
        throw new Error(`No data returned for symbol ${symbol}`)
      }

      // Get the latest price
      const meta = result.meta
      const regularMarketPrice = meta?.regularMarketPrice

      if (!regularMarketPrice || isNaN(regularMarketPrice)) {
        throw new Error(`Invalid price data for symbol ${symbol}`)
      }

      return new Decimal(regularMarketPrice)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Stock not found: ${symbol}`)
        }
        throw new Error(`API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Fetch historical prices from external API
   * 
   * @param symbol - Stock symbol
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of historical prices
   */
  private async fetchHistoricalPricesFromAPI(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; price: Decimal }>> {
    try {
      // Convert dates to Unix timestamps
      const period1 = Math.floor(startDate.getTime() / 1000)
      const period2 = Math.floor(endDate.getTime() / 1000)

      // Use Yahoo Finance API v8
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
      
      // Create axios instance with SSL verification disabled (for development only)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      const response = await axios.get(url, {
        params: {
          period1,
          period2,
          interval: '1d',
        },
        timeout: 10000,
        httpsAgent,
      })

      // Parse response
      const result = response.data?.chart?.result?.[0]
      if (!result) {
        throw new Error(`No data returned for symbol ${symbol}`)
      }

      const timestamps = result.timestamp
      const quotes = result.indicators?.quote?.[0]
      const closePrices = quotes?.close

      if (!timestamps || !closePrices) {
        throw new Error(`Invalid historical data for symbol ${symbol}`)
      }

      // Build price array
      const prices: Array<{ date: Date; price: Decimal }> = []
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i]
        const closePrice = closePrices[i]

        if (closePrice !== null && !isNaN(closePrice)) {
          prices.push({
            date: new Date(timestamp * 1000),
            price: new Decimal(closePrice),
          })
        }
      }

      return prices
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Stock not found: ${symbol}`)
        }
        throw new Error(`API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Search for stocks by symbol or name
   * 
   * @param keyword - Search keyword (must be at least 2 characters)
   * @returns Array of matching stocks
   */
  async searchStocks(keyword: string): Promise<Array<{
    id: string
    symbol: string
    name: string
    industry: string | null
  }>> {
    // Validate keyword length (must be at least 2 characters)
    if (!keyword || keyword.trim().length < 2) {
      return []
    }

    const trimmedKeyword = keyword.trim().toUpperCase()

    try {
      // First, search in local database (台股)
      const localStocks = await this.prisma.stock.findMany({
        where: {
          OR: [
            {
              symbol: {
                contains: trimmedKeyword,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: trimmedKeyword,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          symbol: true,
          name: true,
          industry: true,
        },
        orderBy: [
          { symbol: 'asc' },
        ],
      })

      // If we found local results, return them
      if (localStocks.length > 0) {
        return localStocks
      }

      // Otherwise, try to search US stocks via Yahoo Finance
      const usStocks = await this.searchUSStocks(trimmedKeyword)
      return usStocks
    } catch (error) {
      console.error(`Error searching stocks with keyword "${keyword}":`, error)
      throw new Error(`Failed to search stocks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search for US stocks using Yahoo Finance API
   * 
   * @param keyword - Search keyword
   * @returns Array of matching US stocks
   */
  private async searchUSStocks(keyword: string): Promise<Array<{
    id: string
    symbol: string
    name: string
    industry: string | null
  }>> {
    try {
      // Use Yahoo Finance search/autocomplete API
      const url = 'https://query1.finance.yahoo.com/v1/finance/search'
      
      // Create axios instance with SSL verification disabled (for development only)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      const response = await axios.get(url, {
        params: {
          q: keyword,
          quotesCount: 10,
          newsCount: 0,
          enableFuzzyQuery: false,
          quotesQueryId: 'tss_match_phrase_query',
        },
        timeout: 5000,
        httpsAgent,
      })

      const quotes = response.data?.quotes || []
      
      // Filter for stocks and ETFs (include both EQUITY and ETF types)
      const stocks = quotes
        .filter((quote: any) => 
          (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF') && 
          quote.symbol && 
          quote.shortname
        )
        .map((quote: any) => ({
          id: `us-${quote.symbol}`, // Prefix with 'us-' to distinguish from local stocks
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          industry: quote.sector || quote.quoteType || null, // Use quoteType if sector not available
        }))

      return stocks
    } catch (error) {
      console.error(`Error searching US stocks:`, error)
      // Return empty array on error (don't throw, as this is a fallback search)
      return []
    }
  }

  /**
   * Get historical OHLC (Open, High, Low, Close) data for technical indicators
   * 
   * @param symbol - Stock symbol
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of OHLC data
   */
  async getHistoricalOHLC(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; open: Decimal; high: Decimal; low: Decimal; close: Decimal }>> {
    // Validate inputs
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Stock symbol cannot be empty')
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date')
    }

    try {
      // Convert dates to Unix timestamps
      const period1 = Math.floor(startDate.getTime() / 1000)
      const period2 = Math.floor(endDate.getTime() / 1000)

      // Use Yahoo Finance API v8
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
      
      // Create axios instance with SSL verification disabled (for development only)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      const response = await axios.get(url, {
        params: {
          period1,
          period2,
          interval: '1d',
        },
        timeout: 10000,
        httpsAgent,
      })

      // Parse response
      const result = response.data?.chart?.result?.[0]
      if (!result) {
        throw new Error(`No data returned for symbol ${symbol}`)
      }

      const timestamps = result.timestamp
      const quotes = result.indicators?.quote?.[0]
      
      if (!timestamps || !quotes) {
        throw new Error(`Invalid historical data for symbol ${symbol}`)
      }

      const { open, high, low, close } = quotes

      if (!open || !high || !low || !close) {
        throw new Error(`Incomplete OHLC data for symbol ${symbol}`)
      }

      // Build OHLC array
      const ohlcData: Array<{ date: Date; open: Decimal; high: Decimal; low: Decimal; close: Decimal }> = []
      
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i]
        const openPrice = open[i]
        const highPrice = high[i]
        const lowPrice = low[i]
        const closePrice = close[i]

        // Skip null or invalid data points
        if (
          openPrice !== null && !isNaN(openPrice) &&
          highPrice !== null && !isNaN(highPrice) &&
          lowPrice !== null && !isNaN(lowPrice) &&
          closePrice !== null && !isNaN(closePrice)
        ) {
          ohlcData.push({
            date: new Date(timestamp * 1000),
            open: new Decimal(openPrice),
            high: new Decimal(highPrice),
            low: new Decimal(lowPrice),
            close: new Decimal(closePrice),
          })
        }
      }

      return ohlcData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Stock not found: ${symbol}`)
        }
        throw new Error(`API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

