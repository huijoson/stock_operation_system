import { describe, it, expect } from '@jest/globals';
import { fc } from '@fast-check/jest';

const analyzeSentiment = (headline: string, summary: string): {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: 'low' | 'medium' | 'high';
} => {
  const positiveKeywords = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'profit', 'growth',
    'beat', 'exceed', 'upgrade', 'bullish', 'record', 'strong',
  ];
  const negativeKeywords = [
    'plunge', 'crash', 'drop', 'fall', 'loss', 'decline', 'miss',
    'downgrade', 'bearish', 'layoff', 'lawsuit', 'investigation',
  ];

  const text = `${headline} ${summary}`.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  for (const keyword of positiveKeywords) {
    if (text.includes(keyword)) positiveCount++;
  }
  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) negativeCount++;
  }

  const totalMatches = positiveCount + negativeCount;
  let score = 0;
  let label: 'positive' | 'neutral' | 'negative' = 'neutral';
  let confidence: 'low' | 'medium' | 'high' = 'low';

  if (totalMatches === 0) {
    score = 0;
    label = 'neutral';
    confidence = 'low';
  } else {
    score = ((positiveCount - negativeCount) / totalMatches) * 0.8;
    if (score > 0.2) {
      label = 'positive';
    } else if (score < -0.2) {
      label = 'negative';
    }
    if (totalMatches >= 3) {
      confidence = 'high';
    } else if (totalMatches >= 1) {
      confidence = 'medium';
    }
  }

  return { score, label, confidence };
};

describe('News Sentiment Analysis - Property-based Tests', () => {
  it.prop([fc.string(), fc.string()])(
    '應該總是返回 -1 到 1 之間的分數',
    (headline, summary) => {
      const result = analyzeSentiment(headline, summary);
      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  );

  it.prop([fc.string(), fc.string()])(
    '應該總是返回有效的標籤',
    (headline, summary) => {
      const result = analyzeSentiment(headline, summary);
      expect(['positive', 'neutral', 'negative']).toContain(result.label);
    }
  );

  it.prop([fc.string(), fc.string()])(
    '應該總是返回有效的信心度',
    (headline, summary) => {
      const result = analyzeSentiment(headline, summary);
      expect(['low', 'medium', 'high']).toContain(result.confidence);
    }
  );

  it('應該對正面新聞返回正面情緒', () => {
    const result = analyzeSentiment(
      'Stock Surges to Record High on Strong Earnings Beat',
      'The company exceeded profit expectations with strong growth'
    );
    expect(result.label).toBe('positive');
    expect(result.score).toBeGreaterThan(0);
  });

  it('應該對負面新聞返回負面情緒', () => {
    const result = analyzeSentiment(
      'Stock Plunges After Missing Earnings and Announcing Layoffs',
      'The company reported a significant loss and investigation concerns'
    );
    expect(result.label).toBe('negative');
    expect(result.score).toBeLessThan(0);
  });

  it('應該對中性新聞返回中性情緒', () => {
    const result = analyzeSentiment(
      'Company Announces Regular Quarterly Meeting',
      'The board will meet next week for routine business'
    );
    expect(result.label).toBe('neutral');
    expect(Math.abs(result.score)).toBeLessThan(0.3);
  });

  it.prop([fc.constant('surge gain profit'), fc.constant('excellent news')])(
    '應該對多個正面關鍵字增加信心度',
    (headline, summary) => {
      const result = analyzeSentiment(headline, summary);
      expect(result.confidence).not.toBe('low');
      expect(result.label).toBe('positive');
    }
  );

  it('應該不區分大小寫', () => {
    const result1 = analyzeSentiment('SURGE', 'PROFIT');
    const result2 = analyzeSentiment('surge', 'profit');
    expect(result1.label).toBe(result2.label);
    expect(result1.confidence).toBe(result2.confidence);
  });
});
