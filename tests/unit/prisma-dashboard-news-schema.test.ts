import fs from 'fs';
import path from 'path';

describe('Prisma dashboard news schema', () => {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  it('defines DashboardNewsItem model with required unique key and indexes', () => {
    expect(schema).toContain('model DashboardNewsItem {');
    expect(schema).toContain('externalId  String   @unique');
    expect(schema).toContain('@@index([publishedAt(sort: Desc)])');
    expect(schema).toContain('@@index([category, publishedAt(sort: Desc)])');
    expect(schema).toContain('@@index([syncedAt])');
  });

  it('defines SyncQuotaLog model with unique daily service key', () => {
    expect(schema).toContain('model SyncQuotaLog {');
    expect(schema).toContain('@@unique([date, service])');
  });
});
