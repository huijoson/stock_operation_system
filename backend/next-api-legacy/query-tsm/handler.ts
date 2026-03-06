import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // 查詢TSM交易記錄
    const tsmTransactions = await prisma.transaction.findMany({
      where: { 
        symbol: {
          equals: 'TSM',
          mode: 'insensitive'
        }
      },
      orderBy: { date: 'desc' },
      include: { 
        portfolio: { 
          select: { name: true, id: true } 
        } 
      }
    })
    
    // 查詢當前持股
    const currentHolding = await prisma.holding.findFirst({
      where: {
        symbol: {
          equals: 'TSM',
          mode: 'insensitive'
        }
      },
      include: {
        portfolio: {
          select: { name: true, id: true }
        }
      }
    })
    
    // 分類買入和賣出
    const buyTransactions = tsmTransactions.filter(tx => tx.type === 'BUY')
    const sellTransactions = tsmTransactions.filter(tx => tx.type === 'SELL')
    
    return NextResponse.json({
      summary: {
        total: tsmTransactions.length,
        buyCount: buyTransactions.length,
        sellCount: sellTransactions.length
      },
      buyTransactions: buyTransactions.map(tx => ({
        id: tx.id,
        date: tx.date,
        portfolioName: tx.portfolio.name,
        portfolioId: tx.portfolio.id,
        quantity: tx.quantity.toString(),
        price: tx.price.toString(),
        total: (parseFloat(tx.quantity.toString()) * parseFloat(tx.price.toString())).toFixed(2)
      })),
      sellTransactions: sellTransactions.map(tx => ({
        id: tx.id,
        date: tx.date,
        portfolioName: tx.portfolio.name,
        portfolioId: tx.portfolio.id,
        quantity: tx.quantity.toString(),
        price: tx.price.toString(),
        total: (parseFloat(tx.quantity.toString()) * parseFloat(tx.price.toString())).toFixed(2)
      })),
      currentHolding: currentHolding ? {
        portfolioName: currentHolding.portfolio.name,
        portfolioId: currentHolding.portfolio.id,
        quantity: currentHolding.quantity.toString(),
        averageCost: currentHolding.averageCost.toString(),
        totalCost: (parseFloat(currentHolding.quantity.toString()) * parseFloat(currentHolding.averageCost.toString())).toFixed(2)
      } : null
    })
    
  } catch (error: any) {
    console.error('Query error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
