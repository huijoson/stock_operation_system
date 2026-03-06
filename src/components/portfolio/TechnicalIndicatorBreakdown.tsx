import React from 'react';

interface IndicatorDetail {
  score: number;
  weight: number;
  signal: string;
}

interface TechnicalIndicatorBreakdownProps {
  indicators: {
    rsi: IndicatorDetail;
    macd: IndicatorDetail;
    bollinger: IndicatorDetail;
    fibonacci: IndicatorDetail;
  };
}

export function TechnicalIndicatorBreakdown({ indicators }: TechnicalIndicatorBreakdownProps) {
  const indicatorList = [
    { key: 'rsi', label: 'RSI', data: indicators.rsi },
    { key: 'macd', label: 'MACD', data: indicators.macd },
    { key: 'bollinger', label: '布林通道', data: indicators.bollinger },
    { key: 'fibonacci', label: '費波那契', data: indicators.fibonacci },
  ];

  return (
    <div className="space-y-3">
      {indicatorList.map(({ key, label, data }) => (
        <div key={key} className="border-l-4 border-gray-300 dark:border-gray-600 pl-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{data.score}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{data.signal}</p>
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                data.score <= 30
                  ? 'bg-green-500 dark:bg-green-400'
                  : data.score <= 70
                  ? 'bg-yellow-500 dark:bg-yellow-400'
                  : 'bg-red-500 dark:bg-red-400'
              }`}
              style={{ width: `${data.score}%` }}
              role="progressbar"
              aria-valuenow={data.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label} 分數 ${data.score}`}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
