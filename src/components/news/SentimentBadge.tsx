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
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    neutral: {
      label: '😐 中性',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
    },
    negative: {
      label: '😞 負面',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
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
