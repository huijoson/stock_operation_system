export interface RateLimiterConfig {
  callsPerMinute?: number;
  callsPerSecond?: number;
}

export class RateLimiter {
  private callTimestamps: number[] = [];
  private callsPerMinute: number;
  private callsPerSecond: number | null;

  constructor(config: RateLimiterConfig) {
    this.callsPerMinute = config.callsPerMinute || 60;
    this.callsPerSecond = config.callsPerSecond || null;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    this.callTimestamps = this.callTimestamps.filter(
      (timestamp) => now - timestamp < 60000
    );

    if (this.callTimestamps.length >= this.callsPerMinute) {
      const oldestCall = this.callTimestamps[0];
      const waitTime = 60000 - (now - oldestCall) + 100;
      await this.sleep(waitTime);
      return this.acquire();
    }

    if (this.callsPerSecond !== null && this.callTimestamps.length > 0) {
      const recentCalls = this.callTimestamps.filter((timestamp) => now - timestamp < 1000);
      if (recentCalls.length >= this.callsPerSecond) {
        const waitTime = 1000 - (now - recentCalls[0]) + 50;
        await this.sleep(waitTime);
        return this.acquire();
      }
    }

    this.callTimestamps.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.callTimestamps = [];
  }
}
