import { RateLimiter } from './rate-limiter';

export interface FinnhubNews {
  id: number;
  datetime: number;
  headline: string;
  summary: string;
  url: string;
  image: string;
  source: string;
  category: string;
  related: string;
}

export class FinnhubClient {
  private baseUrl = 'https://finnhub.io/api/v1';
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter({ callsPerMinute: 48 });
  }

  async getCompanyNews(
    symbol: string,
    from?: string,
    to?: string
  ): Promise<FinnhubNews[]> {
    await this.rateLimiter.acquire();

    const fromDate = from || this.getDateDaysAgo(7);
    const toDate = to || this.getToday();

    const url = `${this.baseUrl}/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}`;

    const response = await this.fetchWithTlsHandling(url);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`速率限制：請在 ${retryAfter || 60} 秒後重試`);
      }
      throw new Error(`Finnhub API 錯誤: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as FinnhubNews[];
  }

  async getMarketNews(category: string = 'general'): Promise<FinnhubNews[]> {
    await this.rateLimiter.acquire();

    const url = `${this.baseUrl}/news?category=${category}`;

    const response = await this.fetchWithTlsHandling(url);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`速率限制：請在 ${retryAfter || 60} 秒後重試`);
      }
      throw new Error(`Finnhub API 錯誤: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as FinnhubNews[];
  }

  private async fetchWithTlsHandling(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        headers: {
          'X-Finnhub-Token': this.apiKey,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof TypeError &&
        error.message === 'fetch failed' &&
        (error as { cause?: { code?: string } }).cause?.code ===
          'SELF_SIGNED_CERT_IN_CHAIN'
      ) {
        throw new Error(
          'Finnhub API TLS 錯誤：偵測到自簽憑證。' +
            '請設定環境變數 NODE_TLS_REJECT_UNAUTHORIZED=0（開發環境）' +
            '或 NODE_EXTRA_CA_CERTS 指向 CA 憑證檔案。'
        );
      }
      throw error;
    }
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}
