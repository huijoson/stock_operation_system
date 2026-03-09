import { Decimal } from 'decimal.js'

// Risk Assessment Types
export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskAssessment {
  id: string
  symbol: string
  riskScore: number // 0-100
  riskLevel: RiskLevel
  technicalScore: number
  rsiScore: number
  macdScore: number
  bollingerScore: number
  fibonacciScore: number
  newsScore: number | null
  newsSentiment: NewsSentiment | null
  newsArticleCount: number
  technicalWeight: Decimal
  newsWeight: Decimal
  calculatedAt: Date
  expiresAt: Date
  createdAt: Date
}

// Holding Advice Types
export type AdviceType = 'reduce' | 'hold' | 'add'

export interface HoldingAdvice {
  id: string
  symbol: string
  adviceType: AdviceType
  reasons: string[]
  confidence: number // 0-100
  riskAssessmentId: string | null
  generatedAt: Date
  expiresAt: Date
  createdAt: Date
}

// News Types
export type Credibility = 'official' | 'mainstream' | 'unverified'
export type NewsSentiment = 'positive' | 'neutral' | 'negative'
export type SentimentConfidence = 'low' | 'medium' | 'high'

export interface StockNews {
  id: string
  symbol: string
  externalId: string | null
  headline: string
  summary: string | null
  url: string
  imageUrl: string | null
  source: string
  publishedAt: Date
  credibility: Credibility
  sentimentScore: Decimal // -1.000 to 1.000
  sentimentLabel: NewsSentiment
  sentimentConfidence: SentimentConfidence
  fetchedAt: Date
  expiresAt: Date
  createdAt: Date
}

export interface NewsSourceRating {
  id: string
  sourceName: string
  credibilityLevel: Credibility
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Realized P&L Types
export type HoldingPeriod = 'SHORT' | 'LONG'

export interface TaxLot {
  id: string
  portfolioId: string
  symbol: string
  acquisitionDate: Date
  originalShares: Decimal
  costBasisPerShare: Decimal
  totalCostBasis: Decimal
  remainingShares: Decimal
  transactionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RealizedPL {
  id: string
  portfolioId: string
  transactionId: string
  symbol: string
  taxLotId: string
  sharesSold: Decimal
  costBasis: Decimal
  saleProceeds: Decimal
  realizedPL: Decimal
  saleDate: Date
  holdingPeriod: HoldingPeriod
  createdAt: Date
}

// API Response Types
export interface RealizedPLSummary {
  totalPL: Decimal
  shortTermPL: Decimal
  longTermPL: Decimal
  records: RealizedPL[]
  period: 'month' | 'quarter' | 'year' | 'all'
}

export interface RiskAssessmentResponse {
  assessment: RiskAssessment
  indicators: {
    rsi: number
    macd: number
    bollinger: number
    fibonacci: number
  }
  newsContribution: number | null
  hasInsufficientData: boolean
}

export interface HoldingAdviceResponse {
  advice: HoldingAdvice
  riskAssessment: RiskAssessment | null
  disclaimer: string
}

export interface NewsListResponse {
  news: StockNews[]
  total: number
  hasMore: boolean
}
