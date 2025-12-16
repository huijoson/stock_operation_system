'use client';

import React from 'react';

interface InsufficientDataNoticeProps {
  symbol: string;
  minDataDays?: number;
}

export function InsufficientDataNotice({ symbol, minDataDays = 50 }: InsufficientDataNoticeProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" role="alert">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 mb-1">資料不足，無法評估</h3>
          <p className="text-sm text-amber-700">
            {symbol} 的歷史資料不足（需至少 {minDataDays} 個交易日的資料），無法進行風險評估。
          </p>
          <p className="text-xs text-amber-600 mt-2">
            建議：持續追蹤並累積價格資料後，系統將自動進行風險評估。
          </p>
        </div>
      </div>
    </div>
  );
}
