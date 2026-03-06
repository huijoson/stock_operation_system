import React from 'react';

interface RiskBadgeProps {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ riskLevel, riskScore, size = 'md' }: RiskBadgeProps) {
  const riskConfig = {
    low: {
      label: '低風險',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    medium: {
      label: '中風險',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    },
    high: {
      label: '高風險',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const config = riskConfig[riskLevel];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} font-medium`}
      role="status"
      aria-label={`${config.label}${riskScore !== undefined ? ` ${riskScore}分` : ''}`}
    >
      {config.label}
      {riskScore !== undefined && (
        <span className="font-semibold">({riskScore})</span>
      )}
    </span>
  );
}
