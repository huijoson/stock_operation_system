'use client';

import React from 'react';

interface SentimentBadgeProps {
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  score?: number;
  size?: 'sm' | 'md';
}

export function SentimentBadge({ sentimentLabel, score, size = 'md' }: SentimentBadgeProps) {
  const config = {
    positive: {
      label: '😊 正面',
      bgColor: 'bg-green-100 dark:bg-green-900/40',
      textColor: 'text-green-800 dark:text-green-200',
      borderColor: 'border-green-300 dark:border-green-700',
    },
    neutral: {
      label: '😐 中性',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      textColor: 'text-gray-800 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600',
    },
    negative: {
      label: '😞 負面',
      bgColor: 'bg-red-100 dark:bg-red-900/40',
      textColor: 'text-red-800 dark:text-red-200',
      borderColor: 'border-red-300 dark:border-red-700',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  const sentConfig = config[sentimentLabel];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${sentConfig.bgColor} ${sentConfig.textColor} ${sentConfig.borderColor} ${sizeClasses[size]} font-medium`}
      role="status"
      aria-label={`新聞情緒: ${sentConfig.label}${score !== undefined ? `, 分數 ${score.toFixed(2)}` : ''}`}
    >
      {sentConfig.label}
      {score !== undefined && (
        <span className="font-semibold">({score.toFixed(2)})</span>
      )}
    </span>
  );
}
