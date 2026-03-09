import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'
import { RSIService } from './rsi.service'
import { MACDService } from './macd.service'
import { BollingerBandsService } from './bollinger-bands.service'
import { FibonacciService } from './fibonacci.service'
import { StockService } from './stock.service'

/**
 * Strategy condition types
 */
export type ConditionType = 
  | 'RSI_ABOVE' 
  | 'RSI_BELOW' 
  | 'MACD_GOLDEN_CROSS' 
  | 'MACD_DEATH_CROSS'
  | 'PRICE_ABOVE_BOLLINGER_UPPER'
  | 'PRICE_BELOW_BOLLINGER_LOWER'
  | 'PRICE_NEAR_FIBONACCI'

/**
 * Strategy condition
 */
export interface StrategyCondition {
  type: ConditionType
  value?: number // For threshold-based conditions (e.g., RSI_ABOVE: 70)
  params?: Record<string, unknown> // Additional parameters
}

/**
 * Strategy input for creation
 */
export interface StrategyInput {
  userId: string
  name: string
  description?: string
  conditions: StrategyCondition[]
  logic: 'AND' | 'OR'
}

/**
 * Strategy data structure
 */
export interface Strategy {
  id: string
  userId: string
  name: string
  description: string | null
  conditions: StrategyCondition[]
  logic: 'AND' | 'OR'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Market data for condition evaluation
 */
export interface MarketData {
  symbol: string
  prices: Decimal[]
  currentPrice: Decimal
  dates?: Date[]
}

/**
 * Trade record from backtest
 */
export interface Trade {
  date: Date
  type: 'BUY' | 'SELL'
  price: Decimal
  quantity: number
  profit?: Decimal
  return?: number
}

/**
 * Backtest result
 */
export interface BacktestResult {
  totalTrades: number
  winRate: number
  averageReturn: Decimal
  maxDrawdown: Decimal
  trades: Trade[]
}

/**
 * StrategyService handles strategy creation, evaluation, and backtesting
 * for technical analysis trading strategies.
 * 
 * Supports combining multiple indicator signals using logical operators (AND, OR, NOT)
 * and provides backtesting capabilities to evaluate strategy performance.
 */
export class StrategyService {
  private prisma: PrismaClient
  private rsiService: RSIService
  private macdService: MACDService
  private bollingerService: BollingerBandsService
  private fibonacciService: FibonacciService
  private stockService: StockService

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
    this.rsiService = new RSIService()
    this.macdService = new MACDService()
    this.bollingerService = new BollingerBandsService()
    this.fibonacciService = new FibonacciService()
    this.stockService = new StockService(this.prisma)
  }

  /**
   * Create a new strategy
   * 
   * @param strategy - Strategy input data
   * @returns Created strategy
   * 
   * Requirements: 10.1, 10.2
   */
  async createStrategy(strategy: StrategyInput): Promise<Strategy> {
    // Validate strategy input
    if (!strategy.name || strategy.name.trim().length === 0) {
      throw new Error('Strategy name cannot be empty')
    }

    if (!strategy.conditions || strategy.conditions.length === 0) {
      throw new Error('Strategy must have at least one condition')
    }

    if (!['AND', 'OR'].includes(strategy.logic)) {
      throw new Error('Strategy logic must be either AND or OR')
    }

    // Validate each condition
    for (const condition of strategy.conditions) {
      this.validateCondition(condition)
    }

    // Create strategy in database
    const created = await this.prisma.strategy.create({
      data: {
        userId: strategy.userId,
        name: strategy.name,
        description: strategy.description || null,
        conditions: JSON.parse(JSON.stringify(strategy.conditions)),
        logic: strategy.logic,
        isActive: true,
      },
    })

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      description: created.description,
      conditions: created.conditions as unknown as StrategyCondition[],
      logic: created.logic as 'AND' | 'OR',
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }
  }

  /**
   * Validate a strategy condition
   * 
   * @param condition - Condition to validate
   * @throws Error if condition is invalid
   */
  private validateCondition(condition: StrategyCondition): void {
    const validTypes: ConditionType[] = [
      'RSI_ABOVE',
      'RSI_BELOW',
      'MACD_GOLDEN_CROSS',
      'MACD_DEATH_CROSS',
      'PRICE_ABOVE_BOLLINGER_UPPER',
      'PRICE_BELOW_BOLLINGER_LOWER',
      'PRICE_NEAR_FIBONACCI',
    ]

    if (!validTypes.includes(condition.type)) {
      throw new Error(`Invalid condition type: ${condition.type}`)
    }

    // Validate value for threshold-based conditions
    if (['RSI_ABOVE', 'RSI_BELOW'].includes(condition.type)) {
      if (condition.value === undefined || condition.value < 0 || condition.value > 100) {
        throw new Error(`${condition.type} requires a value between 0 and 100`)
      }
    }

    // Validate Fibonacci condition
    if (condition.type === 'PRICE_NEAR_FIBONACCI') {
      if (!condition.params?.high || !condition.params?.low) {
        throw new Error('PRICE_NEAR_FIBONACCI requires high and low parameters')
      }
    }
  }

  /**
   * Evaluate strategy conditions against market data
   * 
   * @param strategy - Strategy to evaluate
   * @param marketData - Market data for evaluation
   * @returns True if strategy conditions are met
   * 
   * Requirements: 10.2, 10.3, 10.5
   */
  async evaluateConditions(
    strategy: Strategy,
    marketData: MarketData
  ): Promise<boolean> {
    const results: boolean[] = []

    for (const condition of strategy.conditions) {
      const result = await this.evaluateCondition(condition, marketData)
      results.push(result)
    }

    // Apply logic operator
    if (strategy.logic === 'AND') {
      return results.every(r => r === true)
    } else {
      // OR logic
      return results.some(r => r === true)
    }
  }

  /**
   * Evaluate a single condition
   * 
   * @param condition - Condition to evaluate
   * @param marketData - Market data
   * @returns True if condition is met
   */
  private async evaluateCondition(
    condition: StrategyCondition,
    marketData: MarketData
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'RSI_ABOVE': {
          const rsiResult = this.rsiService.calculateRSI(marketData.prices)
          return rsiResult.value > (condition.value || 70)
        }

        case 'RSI_BELOW': {
          const rsiResult = this.rsiService.calculateRSI(marketData.prices)
          return rsiResult.value < (condition.value || 30)
        }

        case 'MACD_GOLDEN_CROSS': {
          const macdResult = this.macdService.calculateMACD(marketData.prices)
          // Check if there's a recent golden cross (within last 3 periods)
          if (macdResult.crossovers.length === 0) return false
          const lastCrossover = macdResult.crossovers[macdResult.crossovers.length - 1]
          const recentCrossover = macdResult.macdLine.length - lastCrossover.index <= 3
          return lastCrossover.type === 'golden' && recentCrossover
        }

        case 'MACD_DEATH_CROSS': {
          const macdResult = this.macdService.calculateMACD(marketData.prices)
          // Check if there's a recent death cross (within last 3 periods)
          if (macdResult.crossovers.length === 0) return false
          const lastCrossover = macdResult.crossovers[macdResult.crossovers.length - 1]
          const recentCrossover = macdResult.macdLine.length - lastCrossover.index <= 3
          return lastCrossover.type === 'death' && recentCrossover
        }

        case 'PRICE_ABOVE_BOLLINGER_UPPER': {
          const bollingerResult = this.bollingerService.calculateBands(marketData.prices)
          return bollingerResult.currentPosition === 'above_upper'
        }

        case 'PRICE_BELOW_BOLLINGER_LOWER': {
          const bollingerResult = this.bollingerService.calculateBands(marketData.prices)
          return bollingerResult.currentPosition === 'below_lower'
        }

        case 'PRICE_NEAR_FIBONACCI': {
          if (!condition.params?.high || !condition.params?.low) {
            return false
          }
          const high = new Decimal(condition.params.high as number)
          const low = new Decimal(condition.params.low as number)
          const isUptrend = condition.params.isUptrend !== false
          
          const fibLevels = this.fibonacciService.calculateRetracement(high, low, isUptrend)
          const tolerance = (condition.params.tolerance as number) || 0.02
          const nearestLevel = this.fibonacciService.findNearestLevel(
            marketData.currentPrice,
            fibLevels,
            tolerance
          )
          
          return nearestLevel !== null
        }

        default:
          return false
      }
    } catch (error) {
      console.error(`Error evaluating condition ${condition.type}:`, error)
      return false
    }
  }

  /**
   * Backtest a strategy using historical data
   * 
   * @param strategyId - Strategy ID
   * @param symbol - Stock symbol
   * @param startDate - Backtest start date
   * @param endDate - Backtest end date
   * @returns Backtest result with statistics
   * 
   * Requirements: 10.4, 10.6
   */
  async backtest(
    strategyId: string,
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<BacktestResult> {
    // Get strategy
    const strategyData = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
    })

    if (!strategyData) {
      throw new Error(`Strategy not found: ${strategyId}`)
    }

    const strategy: Strategy = {
      id: strategyData.id,
      userId: strategyData.userId,
      name: strategyData.name,
      description: strategyData.description,
      conditions: strategyData.conditions as unknown as StrategyCondition[],
      logic: strategyData.logic as 'AND' | 'OR',
      isActive: strategyData.isActive,
      createdAt: strategyData.createdAt,
      updatedAt: strategyData.updatedAt,
    }

    // Get historical prices
    const historicalData = await this.stockService.getHistoricalPrices(
      symbol,
      startDate,
      endDate
    )

    if (historicalData.length < 50) {
      throw new Error('Insufficient historical data for backtesting (need at least 50 data points)')
    }

    // Run backtest simulation
    const trades: Trade[] = []
    let position: 'LONG' | 'SHORT' | null = null
    let entryPrice: Decimal | null = null
    let entryDate: Date | null = null

    // Need at least 50 periods for indicator calculations
    const lookbackPeriod = 50

    for (let i = lookbackPeriod; i < historicalData.length; i++) {
      const currentDate = historicalData[i].date
      const currentPrice = historicalData[i].price
      
      // Get price window for indicator calculations
      const priceWindow = historicalData.slice(i - lookbackPeriod, i + 1).map(d => d.price)
      
      const marketData: MarketData = {
        symbol,
        prices: priceWindow,
        currentPrice,
        dates: historicalData.slice(i - lookbackPeriod, i + 1).map(d => d.date),
      }

      // Evaluate strategy conditions
      const signalTriggered = await this.evaluateConditions(strategy, marketData)

      // Simple strategy: buy when conditions met, sell when conditions not met
      if (signalTriggered && position === null) {
        // Enter long position
        position = 'LONG'
        entryPrice = currentPrice
        entryDate = currentDate
        
        trades.push({
          date: currentDate,
          type: 'BUY',
          price: currentPrice,
          quantity: 1,
        })
      } else if (!signalTriggered && position === 'LONG' && entryPrice && entryDate) {
        // Exit long position
        const profit = currentPrice.minus(entryPrice)
        const returnPct = profit.dividedBy(entryPrice).times(100).toNumber()
        
        trades.push({
          date: currentDate,
          type: 'SELL',
          price: currentPrice,
          quantity: 1,
          profit,
          return: returnPct,
        })
        
        position = null
        entryPrice = null
        entryDate = null
      }
    }

    // Close any open position at the end
    if (position === 'LONG' && entryPrice) {
      const lastPrice = historicalData[historicalData.length - 1].price
      const lastDate = historicalData[historicalData.length - 1].date
      const profit = lastPrice.minus(entryPrice)
      const returnPct = profit.dividedBy(entryPrice).times(100).toNumber()
      
      trades.push({
        date: lastDate,
        type: 'SELL',
        price: lastPrice,
        quantity: 1,
        profit,
        return: returnPct,
      })
    }

    // Calculate statistics
    const sellTrades = trades.filter(t => t.type === 'SELL')
    const totalTrades = sellTrades.length
    
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        averageReturn: new Decimal(0),
        maxDrawdown: new Decimal(0),
        trades: [],
      }
    }

    // Calculate win rate
    const winningTrades = sellTrades.filter(t => t.profit && t.profit.greaterThan(0))
    const winRate = (winningTrades.length / totalTrades) * 100

    // Calculate average return
    const totalReturn = sellTrades.reduce(
      (sum, t) => sum + (t.return || 0),
      0
    )
    const averageReturn = new Decimal(totalReturn / totalTrades)

    // Calculate maximum drawdown
    let peak = new Decimal(0)
    let maxDrawdown = new Decimal(0)
    let cumulativeReturn = new Decimal(0)

    for (const trade of sellTrades) {
      if (trade.return) {
        cumulativeReturn = cumulativeReturn.plus(trade.return)
        
        if (cumulativeReturn.greaterThan(peak)) {
          peak = cumulativeReturn
        }
        
        const drawdown = peak.minus(cumulativeReturn)
        if (drawdown.greaterThan(maxDrawdown)) {
          maxDrawdown = drawdown
        }
      }
    }

    // Save backtest result to database
    await this.prisma.backtest.create({
      data: {
        strategyId,
        startDate,
        endDate,
        totalTrades,
        winRate: winRate.toFixed(2),
        avgReturn: averageReturn.toFixed(4),
        maxDrawdown: maxDrawdown.toFixed(4),
        results: trades.map(t => ({
          date: t.date.toISOString(),
          type: t.type,
          price: t.price.toString(),
          quantity: t.quantity,
          profit: t.profit?.toString(),
          return: t.return,
        })),
      },
    })

    return {
      totalTrades,
      winRate,
      averageReturn,
      maxDrawdown,
      trades,
    }
  }

  /**
   * Get strategy by ID
   * 
   * @param strategyId - Strategy ID
   * @returns Strategy or null if not found
   */
  async getStrategy(strategyId: string): Promise<Strategy | null> {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
    })

    if (!strategy) {
      return null
    }

    return {
      id: strategy.id,
      userId: strategy.userId,
      name: strategy.name,
      description: strategy.description,
      conditions: strategy.conditions as unknown as StrategyCondition[],
      logic: strategy.logic as 'AND' | 'OR',
      isActive: strategy.isActive,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    }
  }

  /**
   * Get all strategies for a user
   * 
   * @param userId - User ID
   * @returns Array of strategies
   */
  async getUserStrategies(userId: string): Promise<Strategy[]> {
    const strategies = await this.prisma.strategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return strategies.map(s => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      description: s.description,
      conditions: s.conditions as unknown as StrategyCondition[],
      logic: s.logic as 'AND' | 'OR',
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  }

  /**
   * Update strategy
   * 
   * @param strategyId - Strategy ID
   * @param updates - Fields to update
   * @returns Updated strategy
   */
  async updateStrategy(
    strategyId: string,
    updates: Partial<StrategyInput>
  ): Promise<Strategy> {
    // Validate updates
    if (updates.conditions) {
      for (const condition of updates.conditions) {
        this.validateCondition(condition)
      }
    }

    if (updates.logic && !['AND', 'OR'].includes(updates.logic)) {
      throw new Error('Strategy logic must be either AND or OR')
    }

    const updated = await this.prisma.strategy.update({
      where: { id: strategyId },
      data: {
        name: updates.name,
        description: updates.description,
        conditions: updates.conditions ? JSON.parse(JSON.stringify(updates.conditions)) : undefined,
        logic: updates.logic,
      },
    })

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      description: updated.description,
      conditions: updated.conditions as unknown as StrategyCondition[],
      logic: updated.logic as 'AND' | 'OR',
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  }

  /**
   * Delete strategy
   * 
   * @param strategyId - Strategy ID
   */
  async deleteStrategy(strategyId: string): Promise<void> {
    await this.prisma.strategy.delete({
      where: { id: strategyId },
    })
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

