import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  AlphaVantageClient,
  AlphaVantageClientError,
} from '@/lib/api/alpha-vantage-client';

global.fetch = jest.fn();

describe('AlphaVantageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends NEWS_SENTIMENT request with expected query params and parses core feed fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        feed: [
          {
            title: 'Fed Signals Rate Cuts',
            url: 'https://example.com/news/fed',
            summary: 'Federal Reserve hinted rate cuts',
            source: 'Reuters',
            time_published: '20240115T120000',
            topics: [{ topic: 'finance' }, { topic: 'economy_macro' }],
          },
        ],
      }),
    });

    const client = new AlphaVantageClient('demo-key');
    const result = await client.getNewsSentiment();

    const [requestedUrl, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    const parsed = new URL(requestedUrl as string);

    expect(parsed.origin + parsed.pathname).toBe('https://www.alphavantage.co/query');
    expect(parsed.searchParams.get('function')).toBe('NEWS_SENTIMENT');
    expect(parsed.searchParams.get('apikey')).toBe('demo-key');
    expect(parsed.searchParams.get('limit')).toBe('50');
    expect(parsed.searchParams.get('sort')).toBe('LATEST');
    expect(requestInit).toEqual(expect.objectContaining({ signal: expect.any(Object) }));

    expect(result).toEqual([
      {
        title: 'Fed Signals Rate Cuts',
        url: 'https://example.com/news/fed',
        summary: 'Federal Reserve hinted rate cuts',
        source: 'Reuters',
        timePublished: '20240115T120000',
        topics: ['finance', 'economy_macro'],
      },
    ]);
  });

  it('throws identifiable timeout error when upstream request is aborted', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    const client = new AlphaVantageClient('demo-key', { timeoutMs: 50 });

    await expect(client.getNewsSentiment()).rejects.toMatchObject({
      code: 'ALPHA_VANTAGE_TIMEOUT',
      name: 'AlphaVantageClientError',
    });
  });

  it('throws identifiable 5xx error when upstream responds with server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'upstream down',
    });

    const client = new AlphaVantageClient('demo-key');

    await expect(client.getNewsSentiment()).rejects.toMatchObject({
      name: 'AlphaVantageClientError',
      code: 'ALPHA_VANTAGE_UPSTREAM_5XX',
      status: 503,
    });
  });
});
