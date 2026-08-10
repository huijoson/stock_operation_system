/**
 * T002 Migration Validation Test
 *
 * Validates that the Prisma migration for DashboardNewsItem and SyncQuotaLog:
 * 1. Exists in the migrations directory
 * 2. Contains correct CREATE TABLE statements with expected columns
 * 3. Contains required indexes (publishedAt DESC, category+publishedAt DESC, syncedAt, date)
 * 4. Contains required unique constraints (externalId, date+service)
 * 5. SQL is syntactically deployable (no obvious issues)
 */

import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'prisma', 'migrations');

// prisma/migrations is gitignored, so a fresh CI checkout has no migrations to
// validate. Skip the suite in that case; it still runs where migrations exist.
const hasMigrations = fs.existsSync(MIGRATIONS_DIR);

const describeMigration = hasMigrations ? describe : describe.skip;

describeMigration('T002: Dashboard News Models Migration', () => {
  let migrationDir: string | null = null;
  let migrationSql: string;

  beforeAll(() => {
    // Find the migration directory matching the pattern
    const dirs = fs.readdirSync(MIGRATIONS_DIR).filter((d) => {
      const fullPath = path.join(MIGRATIONS_DIR, d);
      return fs.statSync(fullPath).isDirectory() && d.includes('add_dashboard_news_models');
    });

    expect(dirs.length).toBeGreaterThanOrEqual(1);
    migrationDir = path.join(MIGRATIONS_DIR, dirs[dirs.length - 1]);

    const sqlPath = path.join(migrationDir, 'migration.sql');
    expect(fs.existsSync(sqlPath)).toBe(true);
    migrationSql = fs.readFileSync(sqlPath, 'utf-8');
  });

  describe('DashboardNewsItem table', () => {
    it('should create the DashboardNewsItem table', () => {
      expect(migrationSql).toContain('CREATE TABLE "DashboardNewsItem"');
    });

    it('should have all required columns with correct types', () => {
      // id: TEXT PRIMARY KEY
      expect(migrationSql).toMatch(/"id"\s+TEXT\s+NOT NULL/);
      // externalId: TEXT NOT NULL (unique handled by index)
      expect(migrationSql).toMatch(/"externalId"\s+TEXT\s+NOT NULL/);
      // title: TEXT NOT NULL
      expect(migrationSql).toMatch(/"title"\s+TEXT\s+NOT NULL/);
      // summary: TEXT (nullable)
      expect(migrationSql).toMatch(/"summary"\s+TEXT/);
      // url: TEXT NOT NULL
      expect(migrationSql).toMatch(/"url"\s+TEXT\s+NOT NULL/);
      // source: TEXT NOT NULL
      expect(migrationSql).toMatch(/"source"\s+TEXT\s+NOT NULL/);
      // publishedAt: TIMESTAMP(3) NOT NULL
      expect(migrationSql).toMatch(/"publishedAt"\s+TIMESTAMP\(3\)\s+NOT NULL/);
      // category: TEXT NOT NULL
      expect(migrationSql).toMatch(/"category"\s+TEXT\s+NOT NULL/);
      // rawTopics: TEXT[] (PostgreSQL array)
      expect(migrationSql).toMatch(/"rawTopics"\s+TEXT\[\]/);
      // syncedAt: TIMESTAMP(3) NOT NULL
      expect(migrationSql).toMatch(/"syncedAt"\s+TIMESTAMP\(3\)\s+NOT NULL/);
      // createdAt: TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      expect(migrationSql).toMatch(/"createdAt"\s+TIMESTAMP\(3\)\s+NOT NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/);
    });

    it('should have a primary key', () => {
      expect(migrationSql).toContain('"DashboardNewsItem_pkey"');
    });

    it('should have unique index on externalId', () => {
      expect(migrationSql).toMatch(
        /CREATE UNIQUE INDEX\s+"DashboardNewsItem_externalId_key"\s+ON\s+"DashboardNewsItem"\("externalId"\)/
      );
    });

    it('should have descending index on publishedAt', () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+"DashboardNewsItem_publishedAt_idx"\s+ON\s+"DashboardNewsItem"\("publishedAt"\s+DESC\)/
      );
    });

    it('should have composite index on category + publishedAt DESC', () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+"DashboardNewsItem_category_publishedAt_idx"\s+ON\s+"DashboardNewsItem"\("category",\s*"publishedAt"\s+DESC\)/
      );
    });

    it('should have index on syncedAt', () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+"DashboardNewsItem_syncedAt_idx"\s+ON\s+"DashboardNewsItem"\("syncedAt"\)/
      );
    });
  });

  describe('SyncQuotaLog table', () => {
    it('should create the SyncQuotaLog table', () => {
      expect(migrationSql).toContain('CREATE TABLE "SyncQuotaLog"');
    });

    it('should have all required columns with correct types', () => {
      // id: TEXT PRIMARY KEY
      expect(migrationSql).toMatch(/"id"\s+TEXT\s+NOT NULL/);
      // date: TEXT NOT NULL
      expect(migrationSql).toMatch(/"date"\s+TEXT\s+NOT NULL/);
      // service: TEXT NOT NULL
      expect(migrationSql).toMatch(/"service"\s+TEXT\s+NOT NULL/);
      // callCount: INTEGER DEFAULT 0
      expect(migrationSql).toMatch(/"callCount"\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      // lastSyncAt: TIMESTAMP(3) nullable
      expect(migrationSql).toMatch(/"lastSyncAt"\s+TIMESTAMP\(3\)/);
      // lastError: TEXT nullable
      expect(migrationSql).toMatch(/"lastError"\s+TEXT/);
      // updatedAt: TIMESTAMP(3) NOT NULL
      expect(migrationSql).toMatch(/"updatedAt"\s+TIMESTAMP\(3\)\s+NOT NULL/);
    });

    it('should have a primary key', () => {
      expect(migrationSql).toContain('"SyncQuotaLog_pkey"');
    });

    it('should have unique constraint on date + service', () => {
      expect(migrationSql).toMatch(
        /CREATE UNIQUE INDEX\s+"SyncQuotaLog_date_service_key"\s+ON\s+"SyncQuotaLog"\("date",\s*"service"\)/
      );
    });

    it('should have index on date', () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+"SyncQuotaLog_date_idx"\s+ON\s+"SyncQuotaLog"\("date"\)/
      );
    });
  });

  describe('Migration completeness', () => {
    it('should only contain DashboardNewsItem and SyncQuotaLog tables', () => {
      const createTableMatches = migrationSql.match(/CREATE TABLE/g) || [];
      expect(createTableMatches.length).toBe(2);
    });

    it('should not contain DROP TABLE statements (forward-only migration)', () => {
      expect(migrationSql).not.toContain('DROP TABLE');
    });

    it('should not contain ALTER TABLE on other tables', () => {
      // This migration should be self-contained, no FK to other tables
      expect(migrationSql).not.toContain('ALTER TABLE');
    });
  });
});
