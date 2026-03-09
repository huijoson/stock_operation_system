import { PrismaClient, NewsSourceRating } from '@prisma/client';

export type CredibilityLevel = 'official' | 'mainstream' | 'unverified';

export class CredibilityService {
  private sourceRatingsCache: Map<string, CredibilityLevel> = new Map();
  private cacheExpiry: Date | null = null;
  private cacheDuration = 60 * 60 * 1000;

  constructor(private prisma: PrismaClient) {}

  async classifySource(sourceName: string): Promise<CredibilityLevel> {
    await this.loadCache();

    const sourceKey = sourceName.toLowerCase();
    return this.sourceRatingsCache.get(sourceKey) || 'unverified';
  }

  async classifyMultipleSources(sourceNames: string[]): Promise<Map<string, CredibilityLevel>> {
    await this.loadCache();

    const result = new Map<string, CredibilityLevel>();
    for (const sourceName of sourceNames) {
      const sourceKey = sourceName.toLowerCase();
      result.set(sourceName, this.sourceRatingsCache.get(sourceKey) || 'unverified');
    }

    return result;
  }

  async getAllSourceRatings(): Promise<NewsSourceRating[]> {
    return await this.prisma.newsSourceRating.findMany({
      where: { isActive: true },
      orderBy: [{ credibilityLevel: 'asc' }, { sourceName: 'asc' }],
    });
  }

  async updateSourceRating(
    sourceName: string,
    credibilityLevel: CredibilityLevel,
    description?: string
  ): Promise<NewsSourceRating> {
    const rating = await this.prisma.newsSourceRating.upsert({
      where: { sourceName },
      create: {
        sourceName,
        credibilityLevel,
        description: description || null,
      },
      update: {
        credibilityLevel,
        description: description || undefined,
      },
    });

    this.invalidateCache();

    return rating;
  }

  private async loadCache(): Promise<void> {
    if (this.cacheExpiry && this.cacheExpiry > new Date()) {
      return;
    }

    const ratings = await this.prisma.newsSourceRating.findMany({
      where: { isActive: true },
    });

    this.sourceRatingsCache.clear();
    for (const rating of ratings) {
      this.sourceRatingsCache.set(
        rating.sourceName.toLowerCase(),
        rating.credibilityLevel as CredibilityLevel
      );
    }

    this.cacheExpiry = new Date(Date.now() + this.cacheDuration);
  }

  private invalidateCache(): void {
    this.cacheExpiry = null;
  }
}

