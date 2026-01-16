'use client';

import React from 'react';
import { RiskBadge } from './RiskBadge';
import { TechnicalIndicatorBreakdown } from './TechnicalIndicatorBreakdown';

interface RiskAssessmentPanelProps {
  assessment: {
    symbol: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskLevelLabel: string;
    technicalAnalysis: {
      score: number;
      components: {
        rsi: { score: number; weight: number; signal: string };
        macd: { score: number; weight: number; signal: string };
        bollinger: { score: number; weight: number; signal: string };
        fibonacci: { score: number; weight: number; signal: string };
      };
    };
    newsSentiment?: {
      score: number;
      sentiment: string;
      sentimentLabel: string;
      articleCount: number;
      confidence: string;
    } | null;
    weights: {
      technical: number;
      news: number;
    };
    calculatedAt: string;
    expiresAt: string;
  };
}

export function RiskAssessmentPanel({ assessment }: RiskAssessmentPanelProps) {
  const calculatedDate = new Date(assessment.calculatedAt).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-transparent dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">風險評估</h2>
        <RiskBadge riskLevel={assessment.riskLevel} riskScore={assessment.riskScore} size="lg" />
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">技術分析 ({Math.round(assessment.weights.technical * 100)}%)</h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">綜合技術分數</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{assessment.technicalAnalysis.score}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  assessment.technicalAnalysis.score <= 40
                    ? 'bg-green-500 dark:bg-green-400'
                    : assessment.technicalAnalysis.score <= 70
                    ? 'bg-yellow-500 dark:bg-yellow-400'
                    : 'bg-red-500 dark:bg-red-400'
                }`}
                style={{ width: `${assessment.technicalAnalysis.score}%` }}
                role="progressbar"
                aria-valuenow={assessment.technicalAnalysis.score}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>

          <TechnicalIndicatorBreakdown indicators={assessment.technicalAnalysis.components} />
        </div>

        {assessment.newsSentiment && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">新聞情緒 ({Math.round(assessment.weights.news * 100)}%)</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">情緒評分</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{assessment.newsSentiment.score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">情緒傾向</span>
                <span className={`font-medium ${
                  assessment.newsSentiment.sentiment === 'positive'
                    ? 'text-green-600 dark:text-green-400'
                    : assessment.newsSentiment.sentiment === 'negative'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {assessment.newsSentiment.sentimentLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">分析新聞數</span>
                <span className="text-gray-900 dark:text-white">{assessment.newsSentiment.articleCount} 則</span>
              </div>
            </div>
          </div>
        )}

        {!assessment.newsSentiment && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">📊 純技術分析</span>
              <br />
              目前風險評估僅基於技術指標，未包含新聞情緒分析。
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        評估時間：{calculatedDate}
      </div>
    </div>
  );
}
