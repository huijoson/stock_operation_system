'use client';

import React from 'react';

interface AdviceTypeBadgeProps {
  adviceType: 'reduce' | 'hold' | 'add';
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AdviceTypeBadge({ adviceType, confidence, size = 'md' }: AdviceTypeBadgeProps) {
  const adviceConfig = {
    reduce: {
      label: '減碼',
      icon: '↓',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
    hold: {
      label: '持有',
      icon: '→',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
    },
    add: {
      label: '加碼',
      icon: '↑',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const config = adviceConfig[adviceType];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} font-medium`}
      role="status"
      aria-label={`建議: ${config.label}${confidence !== undefined ? `, 信心度 ${confidence}%` : ''}`}
    >
      <span className="text-lg leading-none">{config.icon}</span>
      {config.label}
      {confidence !== undefined && (
        <span className="font-semibold">({confidence}%)</span>
      )}
    </span>
  );
}
