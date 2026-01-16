'use client';

import React from 'react';
import { AdviceTypeBadge } from './AdviceTypeBadge';

interface HoldingAdvicePanelProps {
  symbol: string;
  adviceType: 'reduce' | 'hold' | 'add';
  reasons: string[];
  confidence: number;
  generatedAt: Date;
}

export function HoldingAdvicePanel({
  symbol,
  adviceType,
  reasons,
  confidence,
  generatedAt,
}: HoldingAdvicePanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">持股建議</h3>
        <AdviceTypeBadge adviceType={adviceType} confidence={confidence} />
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">建議理由</h4>
          <ul className="space-y-2">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              信心度: <span className="font-semibold text-gray-900 dark:text-white">{confidence}%</span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              更新時間:{' '}
              {new Date(generatedAt).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          ⚠️ 本建議僅供參考，不構成投資建議。投資有風險，請謹慎評估。
        </p>
      </div>
    </div>
  );
}
