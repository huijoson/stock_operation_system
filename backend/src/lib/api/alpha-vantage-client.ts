export type AlphaVantageClientErrorCode =
  | 'ALPHA_VANTAGE_TIMEOUT'
  | 'ALPHA_VANTAGE_UPSTREAM_5XX'
  | 'ALPHA_VANTAGE_REQUEST_FAILED';

export class AlphaVantageClientError extends Error {
  public readonly code: AlphaVantageClientErrorCode;
  public readonly status?: number;

  constructor(code: AlphaVantageClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AlphaVantageClientError';
    this.code = code;
    this.status = status;
  }
}

interface AlphaVantageTopic {
  topic?: string;
}

interface AlphaVantageFeedItemRaw {
  title?: string;
  url?: string;
  summary?: string | null;
  source?: string;
  time_published?: string;
  topics?: AlphaVantageTopic[];
}

interface AlphaVantageNewsSentimentResponseRaw {
  feed?: AlphaVantageFeedItemRaw[];
}

export interface AlphaVantageNewsItem {
  title: string;
  url: string;
  summary: string | null;
  source: string;
  timePublished: string;
  topics: string[];
}

interface AlphaVantageClientOptions {
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class AlphaVantageClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, options: AlphaVantageClientOptions = {}) {
    this.apiKey = apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.baseUrl = options.baseUrl ?? 'https://www.alphavantage.co/query';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getNewsSentiment(): Promise<AlphaVantageNewsItem[]> {
    const requestUrl = new URL(this.baseUrl);
    requestUrl.searchParams.set('function', 'NEWS_SENTIMENT');
    requestUrl.searchParams.set('apikey', this.apiKey);
    requestUrl.searchParams.set('limit', '50');
    requestUrl.searchParams.set('sort', 'LATEST');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(requestUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AlphaVantageClientError(
          'ALPHA_VANTAGE_TIMEOUT',
          'Alpha Vantage request timed out',
        );
      }

      throw new AlphaVantageClientError(
        'ALPHA_VANTAGE_REQUEST_FAILED',
        error instanceof Error ? error.message : 'Alpha Vantage request failed',
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new AlphaVantageClientError(
          'ALPHA_VANTAGE_UPSTREAM_5XX',
          `Alpha Vantage upstream unavailable: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      throw new AlphaVantageClientError(
        'ALPHA_VANTAGE_REQUEST_FAILED',
        `Alpha Vantage request failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const payload = (await response.json()) as AlphaVantageNewsSentimentResponseRaw;
    const feed = Array.isArray(payload.feed) ? payload.feed : [];

    return feed.map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      url: typeof item.url === 'string' ? item.url : '',
      summary: typeof item.summary === 'string' ? item.summary : null,
      source: typeof item.source === 'string' && item.source.trim() !== '' ? item.source : 'Unknown Source',
      timePublished: typeof item.time_published === 'string' ? item.time_published : '',
      topics: Array.isArray(item.topics)
        ? item.topics
            .map((entry) => (typeof entry.topic === 'string' ? entry.topic : ''))
            .filter((topic) => topic !== '')
        : [],
    }));
  }
}
