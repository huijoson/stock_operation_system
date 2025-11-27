'use client';

import React from 'react';

interface CredibilityBadgeProps {
  credibility: 'official' | 'mainstream' | 'unverified';
  size?: 'sm' | 'md';
}

export function CredibilityBadge({ credibility, size = 'md' }: CredibilityBadgeProps) {
  const config = {
    official: {
      label: '🏛️ 官方來源',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    mainstream: {
      label: '📰 主流媒體',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
    },
    unverified: {
      label: '⚠️ 未驗證',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  const credConfig = config[credibility] || config.unverified;

  return (
    <span
      className={`inline-flex items-center rounded-full border ${credConfig.bgColor} ${credConfig.textColor} ${credConfig.borderColor} ${sizeClasses[size]} font-medium`}
      role="status"
      aria-label={`來源可信度: ${credConfig.label}`}
    >
      {credConfig.label}
    </span>
  );
}
