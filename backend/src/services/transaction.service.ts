import { PrismaClient, Transaction, Holding } from '@prisma/client'
import prisma from '../lib/prisma'
import Decimal from 'decimal.js'
import { parseCSV, CSVFormat } from '../lib/csv/csv-parser'
import { taxLotService } from './tax-lot.service'
import { realizedPLService } from './realized-pl.service'

/**
 * Transaction input type
 */
export interface TransactionInput {
  portfolioId: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Decimal
  price: Decimal
  date: Date
}

/**
 * CSV import result
 */
export interface ImportResult {
  successCount: number
  errorCount: number
  skippedCount: number
  errors: Array<{ row: number; message: string }>
}

/**
 * TransactionService handles transaction management operations
 * including creation, retrieval, deletion, and holding updates.
 */
export class TransactionService {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma
  }

  /**
   * Validate transaction parameters
   * 
   * @param transaction - Transaction to validate
   * @throws Error if parameters are invalid
   */
  private validateTransaction(transaction: TransactionInput): void {
    // Validate type
    if (transaction.type !== 'BUY' && transaction.type !== 'SELL') {
      throw new Error('Transaction type must be BUY or SELL')
    }

    // Validate quantity
    if (transaction.quantity.lessThanOrEqualTo(0)) {
      throw new Error('Transaction quantity must be greater than zero')
    }

    // Validate price
    if (transaction.price.lessThanOrEqualTo(0)) {
      throw new Error('Transaction price must be greater than zero')
    }

    // Validate symbol
    if (!transaction.symbol || transaction.symbol.trim().length === 0) {
      throw new Error('Transaction symbol cannot be empty')
    }

    // Validate portfolioId
    if (!transaction.portfolioId || transaction.portfolioId.trim().length === 0) {
      throw new Error('Transaction portfolioId cannot be empty')
    }
  }

  /**
   * Create a new transaction and update holdings
   * 
   * @param transaction - Transaction data
   * @returns Created transaction object
   * @throws Error if validation fails or insufficient holdings for sell
   */
  async createTransaction(transaction: TransactionInput): Promise<Transaction> {
    // Validate transaction parameters
    this.validateTransaction(transaction)

    const { portfolioId, symbol, type, quantity, price, date } = transaction

    // Get existing holding
    const existingHolding = await this.prisma.holding.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol,
        },
      },
    })

    if (type === 'BUY') {
      // Handle buy transaction
      if (existingHolding) {
        // Update existing holding
        const oldTotalCost = new Decimal(existingHolding.quantity.toString()).mul(
          new Decimal(existingHolding.averageCost.toString())
        )
        const newTotalCost = quantity.mul(price)
        const totalCost = oldTotalCost.plus(newTotalCost)
        const newQuantity = new Decimal(existingHolding.quantity.toString()).plus(quantity)
        const newAvgCost = totalCost.div(newQuantity)

        await this.prisma.holding.update({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
          data: {
            quantity: newQuantity.toFixed(8),
            averageCost: newAvgCost.toFixed(8),
          },
        })
      } else {
        // Create new holding
        await this.prisma.holding.create({
          data: {
            portfolioId,
            symbol,
            quantity: quantity.toFixed(8),
            averageCost: price.toFixed(8),
          },
        })
      }

      // Create transaction record first (for BUY)
      const createdTransaction = await this.prisma.transaction.create({
        data: {
          portfolioId,
          symbol,
          type,
          quantity: quantity.toFixed(8),
          price: price.toFixed(8),
          date,
        },
      })

      // Create TaxLot for this BUY transaction (T025)
      await taxLotService.createFromTransaction(createdTransaction)

      return createdTransaction
    } else if (type === 'SELL') {
      // Handle sell transaction
      if (!existingHolding) {
        throw new Error('Cannot sell: no holding exists for this symbol')
      }

      const currentQuantity = new Decimal(existingHolding.quantity.toString())

      // Check if we have enough to sell
      if (quantity.greaterThan(currentQuantity)) {
        throw new Error(
          `Cannot sell ${quantity.toString()} shares: only ${currentQuantity.toString()} available`
        )
      }

      const newQuantity = currentQuantity.minus(quantity)

      if (newQuantity.equals(0)) {
        // Delete holding if quantity becomes zero
        await this.prisma.holding.delete({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
        })
      } else {
        // Update holding with new quantity (average cost remains the same)
        await this.prisma.holding.update({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
          data: {
            quantity: newQuantity.toFixed(8),
          },
        })
      }

      // Create transaction record first (for SELL)
      const createdTransaction = await this.prisma.transaction.create({
        data: {
          portfolioId,
          symbol,
          type,
          quantity: quantity.toFixed(8),
          price: price.toFixed(8),
          date,
        },
      })

      // Calculate and create RealizedPL records for this SELL transaction (T026)
      await realizedPLService.calculateRealizedPL(createdTransaction)

      return createdTransaction
    }

    // This should not be reached due to validation
    throw new Error('Invalid transaction type')
  }

  /**
   * Get all transactions for a portfolio
   * 
   * @param portfolioId - Portfolio ID
   * @returns Array of transactions sorted by date descending
   */
  async getTransactions(portfolioId: string): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { portfolioId },
      orderBy: { date: 'desc' },
    })

    return transactions
  }

  /**
   * Update a transaction and recalculate holdings
   * 
   * @param transactionId - Transaction ID to update
   * @param updates - Updated transaction data
   * @returns Updated transaction object
   * @throws Error if transaction not found
   */
  async updateTransaction(
    transactionId: string,
    updates: {
      type: 'BUY' | 'SELL'
      quantity: number
      price: number
      date: Date
    }
  ): Promise<Transaction> {
    // Get the existing transaction
    const existingTransaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!existingTransaction) {
      throw new Error('Transaction not found')
    }

    const { portfolioId, symbol } = existingTransaction

    // Update the transaction
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type: updates.type,
        quantity: updates.quantity.toString(),
        price: updates.price.toString(),
        date: updates.date,
      },
    })

    // Recalculate holdings for this symbol
    await this.recalculateHoldings(portfolioId, symbol)

    return updatedTransaction
  }

  /**
   * Recalculate holdings for a specific symbol in a portfolio
   * 
   * @param portfolioId - Portfolio ID
   * @param symbol - Stock symbol
   */
  private async recalculateHoldings(portfolioId: string, symbol: string): Promise<void> {
    // Get all transactions for this symbol
    const transactions = await this.prisma.transaction.findMany({
      where: {
        portfolioId,
        symbol,
      },
      orderBy: { date: 'asc' },
    })

    if (transactions.length === 0) {
      // No transactions, delete the holding
      await this.prisma.holding.deleteMany({
        where: {
          portfolioId,
          symbol,
        },
      })
      return
    }

    // Recalculate holding based on all transactions
    let totalQuantity = new Decimal(0)
    let totalCost = new Decimal(0)

    for (const tx of transactions) {
      const txQuantity = new Decimal(tx.quantity.toString())
      const txPrice = new Decimal(tx.price.toString())

      if (tx.type === 'BUY') {
        totalCost = totalCost.plus(txQuantity.mul(txPrice))
        totalQuantity = totalQuantity.plus(txQuantity)
      } else if (tx.type === 'SELL') {
        // For sell, we need to calculate based on current average cost
        const currentAvgCost = totalQuantity.greaterThan(0) 
          ? totalCost.div(totalQuantity) 
          : new Decimal(0)
        
        totalCost = totalCost.minus(txQuantity.mul(currentAvgCost))
        totalQuantity = totalQuantity.minus(txQuantity)
      }
    }

    if (totalQuantity.greaterThan(0)) {
      const avgCost = totalCost.div(totalQuantity)

      // Update or create holding
      await this.prisma.holding.upsert({
        where: {
          portfolioId_symbol: {
            portfolioId,
            symbol,
          },
        },
        update: {
          quantity: totalQuantity.toFixed(8),
          averageCost: avgCost.toFixed(8),
        },
        create: {
          portfolioId,
          symbol,
          quantity: totalQuantity.toFixed(8),
          averageCost: avgCost.toFixed(8),
        },
      })
    } else {
      // Quantity is zero or negative, delete holding
      await this.prisma.holding.deleteMany({
        where: {
          portfolioId,
          symbol,
        },
      })
    }
  }

  /**
   * Delete a transaction and recalculate holdings
   * 
   * @param transactionId - Transaction ID to delete
   * @throws Error if transaction not found
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    // Get the transaction to delete
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const { portfolioId, symbol } = transaction

    // Delete the transaction first
    await this.prisma.transaction.delete({
      where: { id: transactionId },
    })

    // Get all remaining transactions for this symbol (after deletion)
    const remainingTransactions = await this.prisma.transaction.findMany({
      where: {
        portfolioId,
        symbol,
        id: { not: transactionId }, // Exclude the deleted transaction
      },
      orderBy: { date: 'asc' },
    })

    // Recalculate holding from scratch
    if (remainingTransactions.length === 0) {
      // No more transactions, delete the holding
      await this.prisma.holding.deleteMany({
        where: {
          portfolioId,
          symbol,
        },
      })
    } else {
      // Recalculate holding based on remaining transactions
      let totalQuantity = new Decimal(0)
      let totalCost = new Decimal(0)

      for (const tx of remainingTransactions) {
        const txQuantity = new Decimal(tx.quantity.toString())
        const txPrice = new Decimal(tx.price.toString())

        if (tx.type === 'BUY') {
          totalCost = totalCost.plus(txQuantity.mul(txPrice))
          totalQuantity = totalQuantity.plus(txQuantity)
        } else if (tx.type === 'SELL') {
          // For sell, we need to calculate based on current average cost
          const currentAvgCost = totalQuantity.greaterThan(0) 
            ? totalCost.div(totalQuantity) 
            : new Decimal(0)
          
          totalCost = totalCost.minus(txQuantity.mul(currentAvgCost))
          totalQuantity = totalQuantity.minus(txQuantity)
        }
      }

      if (totalQuantity.greaterThan(0)) {
        const avgCost = totalCost.div(totalQuantity)

        // Update or create holding
        await this.prisma.holding.upsert({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
          update: {
            quantity: totalQuantity.toFixed(8),
            averageCost: avgCost.toFixed(8),
          },
          create: {
            portfolioId,
            symbol,
            quantity: totalQuantity.toFixed(8),
            averageCost: avgCost.toFixed(8),
          },
        })
      } else {
        // Quantity is zero or negative, delete holding
        await this.prisma.holding.deleteMany({
          where: {
            portfolioId,
            symbol,
          },
        })
      }
    }
  }

  /**
   * Import transactions from CSV file
   * 
   * @param portfolioId - Portfolio ID
   * @param csvContent - CSV file content as string
   * @param format - CSV format (schwab or firstrade)
   * @returns Import result with success/error counts
   */
  async importFromCSV(portfolioId: string, csvContent: string, format: CSVFormat): Promise<ImportResult> {
    // Parse CSV
    const { transactions: parsedTransactions, errors: parseErrors } = parseCSV(csvContent, format)

    let successCount = 0
    let skippedCount = 0
    const errors: Array<{ row: number; message: string }> = [...parseErrors]

    // Get existing transactions to check for duplicates
    const existingTransactions = await this.prisma.transaction.findMany({
      where: { portfolioId },
    })

    // Process each parsed transaction
    for (const parsedTx of parsedTransactions) {
      try {
        // Check for duplicate
        const isDuplicate = existingTransactions.some(existing => {
          const existingQty = new Decimal(existing.quantity.toString())
          const existingPrice = new Decimal(existing.price.toString())
          
          return (
            existing.symbol === parsedTx.symbol &&
            existing.type === parsedTx.type &&
            existingQty.equals(parsedTx.quantity) &&
            existingPrice.equals(parsedTx.price) &&
            existing.date.toISOString().split('T')[0] === parsedTx.date.toISOString().split('T')[0]
          )
        })

        if (isDuplicate) {
          skippedCount++
          continue
        }

        // Create transaction
        await this.createTransaction({
          portfolioId,
          symbol: parsedTx.symbol,
          type: parsedTx.type,
          quantity: parsedTx.quantity,
          price: parsedTx.price,
          date: parsedTx.date,
        })

        successCount++
      } catch (error) {
        errors.push({
          row: -1, // We don't have row number here
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      successCount,
      errorCount: errors.length,
      skippedCount,
      errors,
    }
  }

  /**
   * Export transactions to CSV format
   * 
   * @param portfolioId - Portfolio ID
   * @returns CSV content as string (Schwab format)
   */
  async exportToCSV(portfolioId: string): Promise<string> {
    // Get all transactions for the portfolio
    const transactions = await this.prisma.transaction.findMany({
      where: { portfolioId },
      orderBy: { date: 'asc' },
    })

    // Create CSV header (Schwab format)
    const header = 'Date,Action,Symbol,Quantity,Price'
    
    // If no transactions, return header only
    if (transactions.length === 0) {
      return header
    }

    // Create CSV rows
    const rows = transactions.map(tx => {
      const dateStr = tx.date.toISOString().split('T')[0] // YYYY-MM-DD
      const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
      const quantity = new Decimal(tx.quantity.toString()).toString()
      const price = new Decimal(tx.price.toString()).toString()
      
      return `${dateStr},${action},${tx.symbol},${quantity},${price}`
    })

    // Combine header and rows
    return header + '\n' + rows.join('\n')
  }

  /**
   * Export holdings to CSV format
   * 
   * @param portfolioId - Portfolio ID
   * @returns CSV content as string
   */
  async exportHoldingsToCSV(portfolioId: string): Promise<string> {
    // Get all holdings for the portfolio
    const holdings = await this.prisma.holding.findMany({
      where: { portfolioId },
      orderBy: { symbol: 'asc' },
    })

    // Create CSV header
    const header = 'Symbol,Quantity,Average Cost,Total Cost'
    
    // If no holdings, return header only
    if (holdings.length === 0) {
      return header
    }

    // Create CSV rows
    const rows = holdings.map(holding => {
      const quantity = new Decimal(holding.quantity.toString())
      const averageCost = new Decimal(holding.averageCost.toString())
      const totalCost = quantity.mul(averageCost)
      
      return `${holding.symbol},${quantity.toString()},${averageCost.toString()},${totalCost.toString()}`
    })

    // Combine header and rows
    return header + '\n' + rows.join('\n')
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

