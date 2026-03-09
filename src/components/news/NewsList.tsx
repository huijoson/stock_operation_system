import React from 'react';
import { NewsCard } from './NewsCard';
import { NewsLoadingState } from './NewsLoadingState';
import { NewsErrorState } from './NewsErrorState';
import Decimal from 'decimal.js';

interface News {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  publishedAt: Date;
  url: string;
  imageUrl: string | null;
  credibility: string;
  sentimentLabel: string;
  sentimentScore: Decimal;
}

interface NewsListProps {
  news: News[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function NewsList({
  news,
  loading = false,
  error = null,
  emptyMessage = '目前沒有相關新聞',
}: NewsListProps) {
  if (loading) {
    return <NewsLoadingState />;
  }

  if (error) {
    return <NewsErrorState message={error} />;
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <NewsCard key={item.id} {...item} />
      ))}
    </div>
  );
}
