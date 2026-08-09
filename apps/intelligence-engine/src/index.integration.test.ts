import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { prisma } from './db.js';

// Integration tier — requires a live, migrated Postgres. Run `npm run infra:up` and
// `npm run db:migrate` first. Not run in pre-commit — see docs/architecture/TESTING.md.

let app: FastifyInstance;
const createdEventIds: string[] = [];

async function mintToken(role: 'citizen' | 'authority'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/dev/token', payload: { role } });
  return JSON.parse(res.body).token;
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterEach(async () => {
  if (createdEventIds.length > 0) {
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    createdEventIds.length = 0;
  }
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('GET /health', () => {
  it('returns ok with no auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });
});

describe('POST /report auth', () => {
  it('rejects with no token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/report',
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/report',
      headers: { authorization: 'Bearer not-a-real-token' },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /report → geom persistence (the Phase 0 bug fix)', () => {
  it('creates an event and actually persists geom, not just accepts coordinates', async () => {
    const token = await mintToken('citizen');
    const res = await app.inject({
      method: 'POST',
      url: '/report',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9172, longitude: 77.6228, category: 'POTHOLE', location: 'Silk Board' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    createdEventIds.push(body.event_id);

    const [row] = await prisma.$queryRaw<{ lng: number; lat: number }[]>`
      SELECT ST_X(geom::geometry) as lng, ST_Y(geom::geometry) as lat
      FROM "Event" WHERE id = ${body.event_id}
    `;
    expect(row).toBeDefined();
    expect(row.lng).toBeCloseTo(77.6228, 4);
    expect(row.lat).toBeCloseTo(12.9172, 4);
  });

  it('rejects an out-of-range latitude with 400, not a DB error', async () => {
    const token = await mintToken('citizen');
    const res = await app.inject({
      method: 'POST',
      url: '/report',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 200, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /events/:id/status auth', () => {
  it('citizen role is forbidden', async () => {
    const token = await mintToken('citizen');
    const citizenReport = await app.inject({
      method: 'POST',
      url: '/report',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    const eventId = JSON.parse(citizenReport.body).event_id;
    createdEventIds.push(eventId);

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'RESOLVED' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('authority role can update status', async () => {
    const citizenToken = await mintToken('citizen');
    const report = await app.inject({
      method: 'POST',
      url: '/report',
      headers: { authorization: `Bearer ${citizenToken}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    const eventId = JSON.parse(report.body).event_id;
    createdEventIds.push(eventId);

    const authorityToken = await mintToken('authority');
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: { authorization: `Bearer ${authorityToken}` },
      payload: { status: 'VERIFIED' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('VERIFIED');
  });
});

describe('GET /events pagination', () => {
  it('returns the documented shape and respects limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/events?limit=1' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('events');
    expect(body).toHaveProperty('nextCursor');
    expect(body.events.length).toBeLessThanOrEqual(1);
  });

  it('rejects a limit above 100', async () => {
    const res = await app.inject({ method: 'GET', url: '/events?limit=101' });
    expect(res.statusCode).toBe(400);
  });
});
