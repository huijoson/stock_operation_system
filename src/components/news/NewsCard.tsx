'use client';

import React from 'react';
import Decimal from 'decimal.js';
import { CredibilityBadge } from './CredibilityBadge';
import { SentimentBadge } from './SentimentBadge';

interface NewsCardProps {
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

export function NewsCard({
  headline,
  summary,
  source,
  publishedAt,
  url,
  imageUrl,
  credibility,
  sentimentLabel,
  sentimentScore,
}: NewsCardProps) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {imageUrl && (
          <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded">
            <img
              src={imageUrl}
              alt={headline}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CredibilityBadge credibility={credibility as 'official' | 'mainstream' | 'unverified'} />
            <SentimentBadge 
              sentimentLabel={sentimentLabel as 'positive' | 'neutral' | 'negative'} 
              score={parseFloat(sentimentScore.toString())}
              size="sm"
            />
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 line-clamp-2">
              {headline}
            </h3>
          </a>

          {summary && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {summary}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{source}</span>
            <span>•</span>
            <time dateTime={new Date(publishedAt).toISOString()}>
              {new Date(publishedAt).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
