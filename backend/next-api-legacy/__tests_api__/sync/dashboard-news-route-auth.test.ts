/**
 * Unit tests for POST /api/sync/dashboard-news — cron security checks (T006).
 *
 * Covers:
 * - Valid Bearer CRON_SECRET → passes auth (200-level response)
 * - Missing Authorization header → 401
 * - Invalid / wrong Bearer token → 401
 * - CRON_SECRET env var not set → 401
 * - x-vercel-cron header behaviour (Vercel-initiated cron)
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// We will dynamically import the route handler so env mutations take effect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let POST: (req: any) => Promise<Response>;

async function importRoute() {
  // Clear module cache so each test picks up env changes
  jest.resetModules();
  const mod = await import('@/app/api/sync/dashboard-news/route');
  POST = mod.POST;
}

describe('POST /api/sync/dashboard-news — cron auth (T006)', () => {
  const VALID_SECRET = 'test-cron-secret-abc123';

  beforeEach(async () => {
    process.env.CRON_SECRET = VALID_SECRET;
    await importRoute();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  // ─── 401 scenarios ────────────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(typeof body.error).toBe('string');
  });

  it('returns 401 when Authorization header has wrong token', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-token',
      },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization scheme is not Bearer', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${VALID_SECRET}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    await importRoute(); // re-import without env var

    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VALID_SECRET}`,
      },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // ─── Success / pass-through scenarios ─────────────────────────

  it('passes auth with valid Bearer CRON_SECRET (no x-vercel-cron)', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VALID_SECRET}`,
      },
    });

    const res = await POST(req);

    // Auth passed – the skeleton may return 200 or delegate to sync service.
    // It must NOT be 401.
    expect(res.status).not.toBe(401);
  });

  it('passes auth when x-vercel-cron header is present with valid Bearer', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VALID_SECRET}`,
        'x-vercel-cron': '1',
      },
    });

    const res = await POST(req);

    expect(res.status).not.toBe(401);
  });

  it('returns 401 when x-vercel-cron header is present but Bearer is invalid', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer bad-token',
        'x-vercel-cron': '1',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ─── Response body contract ───────────────────────────────────

  it('401 response includes zh-TW error message', async () => {
    const req = new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    // Per contract: error: "未授權的請求"
    expect(body.error).toBe('未授權的請求');
  });
});
