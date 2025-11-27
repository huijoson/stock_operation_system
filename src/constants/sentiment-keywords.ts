export interface SentimentKeywords {
  positive: string[]
  negative: string[]
}

export const SENTIMENT_KEYWORDS: SentimentKeywords = {
  positive: [
    'beat', 'exceed', 'outperform', 'gain', 'profit', 'growth', 'surge',
    'rally', 'breakthrough', 'success', 'strong', 'record', 'upgrade',
    'bullish', 'acquisition', 'expansion', 'innovation', 'approval',
    'milestone', 'momentum', 'optimistic', 'recovery', 'boost', 'jump',
    'soar', 'rise', 'advance', 'win', 'award', 'launch'
  ],
  negative: [
    'miss', 'decline', 'loss', 'fall', 'drop', 'downgrade', 'bearish',
    'crash', 'plunge', 'warning', 'lawsuit', 'investigation', 'scandal',
    'bankruptcy', 'layoff', 'cut', 'reduction', 'weak', 'concern',
    'risk', 'penalty', 'failure', 'delay', 'suspend', 'recall',
    'fraud', 'violation', 'slump', 'tumble', 'sink'
  ]
}

export interface SentimentAnalysisResult {
  positiveCount: number
  negativeCount: number
  sentimentScore: number // -1.000 to 1.000
  sentimentLabel: 'positive' | 'neutral' | 'negative'
  confidence: 'low' | 'medium' | 'high'
}

export function analyzeSentiment(text: string): SentimentAnalysisResult {
  const lowerText = text.toLowerCase()
  
  const positiveCount = SENTIMENT_KEYWORDS.positive.filter(
    (keyword) => lowerText.includes(keyword)
  ).length
  
  const negativeCount = SENTIMENT_KEYWORDS.negative.filter(
    (keyword) => lowerText.includes(keyword)
  ).length
  
  const totalKeywords = positiveCount + negativeCount
  
  // Calculate sentiment score (-1 to 1)
  let sentimentScore = 0
  if (totalKeywords > 0) {
    sentimentScore = (positiveCount - negativeCount) / totalKeywords
  }
  
  // Determine label
  let sentimentLabel: 'positive' | 'neutral' | 'negative'
  if (sentimentScore > 0.2) {
    sentimentLabel = 'positive'
  } else if (sentimentScore < -0.2) {
    sentimentLabel = 'negative'
  } else {
    sentimentLabel = 'neutral'
  }
  
  // Determine confidence based on keyword count
  let confidence: 'low' | 'medium' | 'high'
  if (totalKeywords >= 5) {
    confidence = 'high'
  } else if (totalKeywords >= 2) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }
  
  return {
    positiveCount,
    negativeCount,
    sentimentScore,
    sentimentLabel,
    confidence
  }
}
