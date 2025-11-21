import Decimal from 'decimal.js'

/**
 * CalculationService
 * 
 * Provides financial calculation functions for the portfolio management system.
 * All calculations use Decimal.js for high-precision arithmetic to avoid
 * floating-point errors.
 */

/**
 * Holding interface representing a stock position
 */
export interface Holding {
  symbol: string
  quantity: Decimal
  averageCost: Decimal
}

/**
 * Transaction interface representing a buy or sell operation
 */
export interface Transaction {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Decimal
  price: Decimal
  date: Date
}

/**
 * Calculate unrealized profit/loss for a holding
 * 
 * Formula: (currentPrice - averageCost) * quantity
 * 
 * @param holding The holding to calculate P&L for
 * @param currentPrice The current market price of the stock
 * @returns Unrealized P&L as Decimal
 */
export function calculateUnrealizedPL(
  holding: Holding,
  currentPrice: Decimal
): Decimal {
  // (currentPrice - averageCost) * quantity
  return currentPrice.minus(holding.averageCost).mul(holding.quantity)
}

/**
 * Calculate total unrealized profit/loss for multiple holdings
 * 
 * Formula: Sum of all holdings' unrealized P&L
 * 
 * @param holdings Array of holdings
 * @param priceMap Map of symbol to current price
 * @returns Total unrealized P&L as Decimal
 */
export function calculateTotalUnrealizedPL(
  holdings: Holding[],
  priceMap: Record<string, Decimal>
): Decimal {
  let total = new Decimal(0)
  
  for (const holding of holdings) {
    const currentPrice = priceMap[holding.symbol]
    if (currentPrice) {
      const unrealizedPL = calculateUnrealizedPL(holding, currentPrice)
      total = total.plus(unrealizedPL)
    }
  }
  
  return total
}

/**
 * Calculate realized profit/loss from transactions
 * 
 * Formula: Sum of (sellPrice - avgCost) * quantity for all SELL transactions
 * 
 * @param transactions Array of transactions
 * @param avgCostMap Map of symbol to average cost at time of sale
 * @returns Realized P&L as Decimal
 */
export function calculateRealizedPL(
  transactions: Transaction[],
  avgCostMap: Record<string, Decimal>
): Decimal {
  let total = new Decimal(0)
  
  for (const tx of transactions) {
    if (tx.type === 'SELL') {
      const avgCost = avgCostMap[tx.symbol]
      if (avgCost) {
        // (sellPrice - avgCost) * quantity
        const pl = tx.price.minus(avgCost).mul(tx.quantity)
        total = total.plus(pl)
      }
    }
  }
  
  return total
}

/**
 * Calculate total profit/loss (realized + unrealized)
 * 
 * @param realizedPL Realized profit/loss
 * @param unrealizedPL Unrealized profit/loss
 * @returns Total P&L as Decimal
 */
export function calculateTotalPL(
  realizedPL: Decimal,
  unrealizedPL: Decimal
): Decimal {
  return realizedPL.plus(unrealizedPL)
}

/**
 * Calculate return rate as percentage
 * 
 * Formula: (totalPL / totalCost) * 100
 * 
 * @param totalPL Total profit/loss
 * @param totalCost Total cost basis
 * @returns Return rate as percentage (Decimal)
 * @throws Error if totalCost is zero
 */
export function calculateReturnRate(
  totalPL: Decimal,
  totalCost: Decimal
): Decimal {
  if (totalCost.isZero()) {
    throw new Error('Cannot calculate return rate: total cost is zero')
  }
  
  // (totalPL / totalCost) * 100
  return totalPL.div(totalCost).mul(100)
}
