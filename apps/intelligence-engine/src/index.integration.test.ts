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

async function createTestEvent(coords: { latitude: number; longitude: number } = { latitude: 12.9, longitude: 77.6 }): Promise<string> {
  const token = await mintToken('citizen');
  const res = await app.inject({
    method: 'POST',
    url: '/v1/events',
    headers: { authorization: `Bearer ${token}` },
    payload: { ...coords, category: 'POTHOLE' },
  });
  const eventId = JSON.parse(res.body).event_id;
  createdEventIds.push(eventId);
  return eventId;
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
  it('returns ok with no auth, unversioned', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });
});

describe('POST /v1/events auth', () => {
  it('rejects with no token, standardized error shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    // docs/standards/backend-engineering-standards.md Section 13: { error: { code, message } },
    // never a bare string.
    expect(body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  });

  it('rejects a malformed token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: 'Bearer not-a-real-token' },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /v1/events → geom persistence (the Phase 0 bug fix)', () => {
  it('creates an event and actually persists geom, not just accepts coordinates', async () => {
    const token = await mintToken('citizen');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
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

  it('rejects an out-of-range latitude with 400, not a DB error, standardized error shape', async () => {
    const token = await mintToken('citizen');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 200, longitude: 77.6, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined(); // Zod flatten() output, for building form errors
  });
});

describe('PATCH /v1/events/:id/status auth', () => {
  it('citizen role is forbidden', async () => {
    const eventId = await createTestEvent();
    const citizenToken = await mintToken('citizen');

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}/status`,
      headers: { authorization: `Bearer ${citizenToken}` },
      payload: { status: 'VERIFIED' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('authority role can make a legal transition (REPORTED -> VERIFIED)', async () => {
    const eventId = await createTestEvent();
    const authorityToken = await mintToken('authority');

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}/status`,
      headers: { authorization: `Bearer ${authorityToken}` },
      payload: { status: 'VERIFIED' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('VERIFIED');
  });
});

describe('PATCH /v1/events/:id/status transition rules', () => {
  it('rejects an illegal transition (REPORTED -> RESOLVED, skipping IN_PROGRESS) with 409', async () => {
    const eventId = await createTestEvent();
    const authorityToken = await mintToken('authority');

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}/status`,
      headers: { authorization: `Bearer ${authorityToken}` },
      payload: { status: 'RESOLVED' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('returns 404 for a nonexistent event, standardized error shape', async () => {
    const authorityToken = await mintToken('authority');
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/events/00000000-0000-0000-0000-000000000000/status',
      headers: { authorization: `Bearer ${authorityToken}` },
      payload: { status: 'VERIFIED' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('EVENT_NOT_FOUND');
  });

  it('a terminal state (RESOLVED) rejects any further transition', async () => {
    const eventId = await createTestEvent();
    const authorityToken = await mintToken('authority');

    // Walk the legal path to RESOLVED: REPORTED -> VERIFIED -> IN_PROGRESS -> RESOLVED
    for (const status of ['VERIFIED', 'IN_PROGRESS', 'RESOLVED']) {
      const step = await app.inject({
        method: 'PATCH',
        url: `/v1/events/${eventId}/status`,
        headers: { authorization: `Bearer ${authorityToken}` },
        payload: { status },
      });
      expect(step.statusCode).toBe(200);
    }

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}/status`,
      headers: { authorization: `Bearer ${authorityToken}` },
      payload: { status: 'VERIFIED' },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /v1/events rate limiting', () => {
  // Deliberately does NOT use the shared `app` instance: @fastify/rate-limit's default
  // keyGenerator is client IP, and every fastify.inject() call looks like the same IP
  // (127.0.0.1) — so this test would otherwise share a rate-limit bucket with every other
  // POST /v1/events call in this file (there are ~8 of them), making it flaky depending on
  // test order/count instead of testing what it claims to. A fresh buildApp() gets a clean
  // counter. See docs/architecture/IMPLEMENTATION_NOTES.md.
  it('allows up to the configured limit, then 429s', async () => {
    const rateLimitedApp = buildApp();
    await rateLimitedApp.ready();
    const token = (async () => {
      const res = await rateLimitedApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
      return JSON.parse(res.body).token;
    })();
    const authToken = await token;

    try {
      const localCreatedIds: string[] = [];
      // manifest.ts: { max: 10, timeWindow: '1 minute' } for CreateEvent
      for (let i = 0; i < 10; i++) {
        const res = await rateLimitedApp.inject({
          method: 'POST',
          url: '/v1/events',
          headers: { authorization: `Bearer ${authToken}` },
          payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
        });
        expect(res.statusCode).toBe(200);
        localCreatedIds.push(JSON.parse(res.body).event_id);
      }

      const res11 = await rateLimitedApp.inject({
        method: 'POST',
        url: '/v1/events',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
      });
      expect(res11.statusCode).toBe(429);

      await prisma.event.deleteMany({ where: { id: { in: localCreatedIds } } });
    } finally {
      await rateLimitedApp.close();
    }
  });
});

describe('GET /v1/events bbox/radius filtering', () => {
  // Own buildApp() instance, same reason as the rate-limit test: this fixture needs several
  // POST /v1/events calls, and the shared `app` instance's rate-limit bucket (10/min) is
  // already spent down by unrelated tests elsewhere in this file — see
  // docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  let geoApp: FastifyInstance;
  const geoEventIds: string[] = [];
  // Silk Board (inside the test bbox) vs. Whitefield (~15km away, outside it/outside the radius)
  const INSIDE = { latitude: 12.9172, longitude: 77.6228 };
  const OUTSIDE = { latitude: 12.9698, longitude: 77.75 };
  const TEST_BBOX = '77.55,12.85,77.65,12.95'; // encloses INSIDE, excludes OUTSIDE

  beforeAll(async () => {
    geoApp = buildApp();
    await geoApp.ready();
    const token = await (async () => {
      const res = await geoApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
      return JSON.parse(res.body).token;
    })();

    for (const coords of [INSIDE, OUTSIDE]) {
      const res = await geoApp.inject({
        method: 'POST',
        url: '/v1/events',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...coords, category: 'POTHOLE' },
      });
      geoEventIds.push(JSON.parse(res.body).event_id);
    }
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { id: { in: geoEventIds } } });
    await geoApp.close();
  });

  it('bbox includes the event inside it and excludes the one outside', async () => {
    const res = await geoApp.inject({ method: 'GET', url: `/v1/events?bbox=${TEST_BBOX}&limit=100` });
    expect(res.statusCode).toBe(200);
    const ids = JSON.parse(res.body).events.map((e: { id: string }) => e.id);
    expect(ids).toContain(geoEventIds[0]); // INSIDE
    expect(ids).not.toContain(geoEventIds[1]); // OUTSIDE
  });

  it('radius search from a point near INSIDE finds it but not the far event', async () => {
    const res = await geoApp.inject({
      method: 'GET',
      url: `/v1/events?lat=${INSIDE.latitude}&lng=${INSIDE.longitude}&radiusKm=2&limit=100`,
    });
    expect(res.statusCode).toBe(200);
    const ids = JSON.parse(res.body).events.map((e: { id: string }) => e.id);
    expect(ids).toContain(geoEventIds[0]);
    expect(ids).not.toContain(geoEventIds[1]);
  });

  it('rejects a malformed bbox with 400', async () => {
    const res = await geoApp.inject({ method: 'GET', url: '/v1/events?bbox=not,a,valid,bbox' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects bbox combined with radius params with 400', async () => {
    const res = await geoApp.inject({ method: 'GET', url: `/v1/events?bbox=${TEST_BBOX}&lat=12.9&lng=77.6&radiusKm=5` });
    expect(res.statusCode).toBe(400);
  });
});

describe('Confidence scoring (multi-signal v2)', () => {
  // Own buildApp() instance — same rate-limit-budget reason as the other dedicated-app
  // describe blocks above. See docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  let scoringApp: FastifyInstance;
  const scoringEventIds: string[] = [];

  beforeAll(async () => {
    scoringApp = buildApp();
    await scoringApp.ready();
  });

  afterEach(async () => {
    if (scoringEventIds.length > 0) {
      // Event -> Report/Evidence has no cascade delete in schema.prisma — deleting an Event
      // with linked rows fails with a foreign-key violation. No app code deletes events today
      // (that's why this never mattered before this test), but children must go first here.
      // See docs/architecture/IMPLEMENTATION_NOTES.md.
      await prisma.report.deleteMany({ where: { event_id: { in: scoringEventIds } } });
      await prisma.evidence.deleteMany({ where: { event_id: { in: scoringEventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: scoringEventIds } } });
      scoringEventIds.length = 0;
    }
  });

  afterAll(async () => {
    await scoringApp.close();
  });

  async function scoringToken(): Promise<string> {
    const res = await scoringApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
    return JSON.parse(res.body).token;
  }

  it('scores 0 with no reporterId and no media (the formula has nothing to count)', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
    });
    const eventId = JSON.parse(res.body).event_id;
    scoringEventIds.push(eventId);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.confidence_score).toBe(0);
  });

  it('scores 20 with a reporterId (one unique reporter, +20)', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE', reporterId: 'citizen-abc' },
    });
    const eventId = JSON.parse(res.body).event_id;
    scoringEventIds.push(eventId);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.confidence_score).toBe(20);
  });

  it('scores 35 with a reporterId and one media item (+20 reporter, +15 evidence)', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        latitude: 12.9,
        longitude: 77.6,
        category: 'POTHOLE',
        reporterId: 'citizen-abc',
        mediaUrls: ['https://example.com/photo.jpg'],
      },
    });
    const eventId = JSON.parse(res.body).event_id;
    scoringEventIds.push(eventId);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.confidence_score).toBe(35);
  });

  it('counts unique reporters, not total reports (dedup by user_id)', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE', reporterId: 'citizen-abc' },
    });
    const eventId = JSON.parse(res.body).event_id;
    scoringEventIds.push(eventId);

    // Inserting Report rows directly (bypassing the API's duplicate-detection path) to
    // exercise recalculateConfidence()'s reporter-dedup logic in isolation from corroboration
    // eligibility — see events/index.ts's reporterSignal().
    await prisma.report.create({ data: { event_id: eventId, user_id: 'citizen-abc' } }); // same reporter again
    await prisma.report.create({ data: { event_id: eventId, user_id: 'citizen-xyz' } }); // different reporter

    const { recalculateConfidence } = await import('./events/index.js');
    const score = await recalculateConfidence(eventId);
    expect(score).toBe(35); // 2 unique reporters: min(60, 20 + 15*(2-1)) = 35
  });

  it('flagging an event FRAUD applies the -50 penalty and clamps at 0', async () => {
    const token = await scoringToken();
    const authorityToken = (async () => {
      const r = await scoringApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'authority' } });
      return JSON.parse(r.body).token;
    })();

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE', reporterId: 'citizen-abc' },
    });
    const eventId = JSON.parse(res.body).event_id;
    scoringEventIds.push(eventId);

    const fraudRes = await scoringApp.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}/status`,
      headers: { authorization: `Bearer ${await authorityToken}` },
      payload: { status: 'FRAUD' },
    });
    expect(fraudRes.statusCode).toBe(200);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    // score was 20 (one reporter), -50 for fraud = -30, clamped to 0
    expect(event.confidence_score).toBe(0);
  });

  it('rejects more than 10 mediaUrls', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        latitude: 12.9,
        longitude: 77.6,
        category: 'POTHOLE',
        mediaUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-URL mediaUrls entry', async () => {
    const token = await scoringToken();
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE', mediaUrls: ['not-a-url'] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/events cache does not serve stale data after a write', () => {
  // Own buildApp() instance — same rate-limit-budget reason as the other dedicated-app
  // describe blocks. See docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  // The whole reason list-cache.ts invalidates on every write instead of just expiring on a
  // TTL: this exact scenario. Two identical GET calls with a create in between must show the
  // new event on the second call, not a cached copy of the first response.
  it('a repeated identical query reflects an event created since the last call', async () => {
    const cacheApp = buildApp();
    await cacheApp.ready();
    try {
      const first = await cacheApp.inject({ method: 'GET', url: '/v1/events?limit=5' });
      const firstIds = new Set(JSON.parse(first.body).events.map((e: { id: string }) => e.id));

      const tokenRes = await cacheApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
      const token = JSON.parse(tokenRes.body).token;
      const createRes = await cacheApp.inject({
        method: 'POST',
        url: '/v1/events',
        headers: { authorization: `Bearer ${token}` },
        payload: { latitude: 12.9, longitude: 77.6, category: 'POTHOLE' },
      });
      const eventId = JSON.parse(createRes.body).event_id;

      try {
        const second = await cacheApp.inject({ method: 'GET', url: '/v1/events?limit=5' });
        const secondIds = JSON.parse(second.body).events.map((e: { id: string }) => e.id);

        expect(firstIds.has(eventId)).toBe(false);
        expect(secondIds).toContain(eventId);
      } finally {
        await prisma.event.deleteMany({ where: { id: eventId } });
      }
    } finally {
      await cacheApp.close();
    }
  });
});

describe('GET /v1/events pagination', () => {
  it('returns the documented shape and respects limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/events?limit=1' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('events');
    expect(body).toHaveProperty('nextCursor');
    expect(body.events.length).toBeLessThanOrEqual(1);
  });

  it('rejects a limit above 100', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/events?limit=101' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/events/clusters', () => {
  // Own buildApp() instance — same rate-limit-budget reason as the other dedicated-app
  // blocks. See docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  //
  // Two events at the EXACT SAME coordinates (not just "close together") — deliberately, not
  // laziness: ST_SnapToGrid cell boundaries are anchored at fixed multiples of the grid size,
  // so two merely-nearby points have a small but real chance of straddling a boundary and
  // landing in different cells depending on where that boundary falls, which would make this
  // test flaky. Identical coordinates always snap to the same cell, no luck involved. The FAR
  // point is ~7.8km away, safely outside even the coarsest 1000m grid at any zoom this app uses.
  //
  // The two SAME-coordinate events use DIFFERENT categories (POTHOLE, GARBAGE) — duplicate/
  // corroboration detection (see geo-query.ts's findDuplicateCandidateEventId()) is
  // category-scoped, so identical coordinates AND category would now merge into one Event
  // instead of creating two, which would break this test's premise of two distinct Event rows
  // clustering together. Clustering itself is category-agnostic (pure spatial grouping), so
  // this preserves the test's original intent.
  let clusterApp: FastifyInstance;
  const clusterEventIds: string[] = [];
  const SAME = { latitude: 12.9, longitude: 77.6 };
  const FAR = { latitude: 12.95, longitude: 77.65 };
  const CLUSTER_BBOX = '77.55,12.85,77.7,13.0'; // encloses both SAME and FAR

  beforeAll(async () => {
    clusterApp = buildApp();
    await clusterApp.ready();
    const tokenRes = await clusterApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
    const token = JSON.parse(tokenRes.body).token;

    for (const { coords, category } of [
      { coords: SAME, category: 'POTHOLE' },
      { coords: SAME, category: 'GARBAGE' },
      { coords: FAR, category: 'POTHOLE' },
    ]) {
      const res = await clusterApp.inject({
        method: 'POST',
        url: '/v1/events',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...coords, category },
      });
      clusterEventIds.push(JSON.parse(res.body).event_id);
    }
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { id: { in: clusterEventIds } } });
    await clusterApp.close();
  });

  it('groups the two identical-coordinate events into one cluster of count 2 at a low zoom', async () => {
    const res = await clusterApp.inject({ method: 'GET', url: `/v1/events/clusters?zoom=10&bbox=${CLUSTER_BBOX}` });
    expect(res.statusCode).toBe(200);
    const { clusters } = JSON.parse(res.body);

    expect(clusters).toHaveLength(2); // one cluster of 2 (SAME), one of 1 (FAR)
    const sameCluster = clusters.find((c: { count: number }) => c.count === 2);
    const farCluster = clusters.find((c: { count: number }) => c.count === 1);
    expect(sameCluster).toBeDefined();
    expect(farCluster).toBeDefined();
    // count > 1 clusters don't carry a single eventId/category — see geo-query.ts
    expect(sameCluster.eventId).toBeUndefined();
    expect(farCluster.eventId).toBeDefined();
  });

  it('returns individual, unclustered markers at zoom >= 17', async () => {
    const res = await clusterApp.inject({ method: 'GET', url: `/v1/events/clusters?zoom=17&bbox=${CLUSTER_BBOX}` });
    expect(res.statusCode).toBe(200);
    const { clusters } = JSON.parse(res.body);

    expect(clusters).toHaveLength(3);
    expect(clusters.every((c: { count: number }) => c.count === 1)).toBe(true);
    expect(clusters.every((c: { eventId?: string }) => c.eventId !== undefined)).toBe(true);
  });

  it('rejects a missing zoom with 400', async () => {
    const res = await clusterApp.inject({ method: 'GET', url: '/v1/events/clusters' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /v1/events duplicate/corroboration detection', () => {
  // Own buildApp() instance — same rate-limit-budget reason as the other dedicated-app
  // blocks. See docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  let dupApp: FastifyInstance;
  const dupEventIds: string[] = [];
  const BASE = { latitude: 12.97, longitude: 77.6 };
  // ~111m north of BASE (0.001 deg lat * ~111.32km/deg) — inside the 150m dedup radius.
  const NEARBY = { latitude: 12.971, longitude: 77.6 };
  // ~1.1km north of BASE — well outside the 150m dedup radius.
  const FAR = { latitude: 12.98, longitude: 77.6 };

  beforeAll(async () => {
    dupApp = buildApp();
    await dupApp.ready();
  });

  afterEach(async () => {
    if (dupEventIds.length > 0) {
      await prisma.report.deleteMany({ where: { event_id: { in: dupEventIds } } });
      await prisma.evidence.deleteMany({ where: { event_id: { in: dupEventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: dupEventIds } } });
      dupEventIds.length = 0;
    }
  });

  afterAll(async () => {
    await dupApp.close();
  });

  async function postEvent(coords: { latitude: number; longitude: number }, category: string, reporterId: string) {
    const tokenRes = await dupApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
    const token = JSON.parse(tokenRes.body).token;
    const res = await dupApp.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...coords, category, reporterId },
    });
    const eventId = JSON.parse(res.body).event_id;
    dupEventIds.push(eventId);
    return eventId;
  }

  it('a same-category report within the radius+time window attaches to the existing event, not a new one', async () => {
    const firstId = await postEvent(BASE, 'POTHOLE', 'citizen-1');
    const secondId = await postEvent(NEARBY, 'POTHOLE', 'citizen-2');

    expect(secondId).toBe(firstId); // merged, not a second Event row

    const event = await prisma.event.findUniqueOrThrow({ where: { id: firstId } });
    // 2 unique reporters (citizen-1, citizen-2): min(60, 20 + 15*(2-1)) = 35
    expect(event.confidence_score).toBe(35);

    const reportCount = await prisma.report.count({ where: { event_id: firstId } });
    expect(reportCount).toBe(2);
  });

  it('a different category at the same coordinates does NOT merge — corroboration is category-scoped', async () => {
    const firstId = await postEvent(BASE, 'POTHOLE', 'citizen-1');
    const secondId = await postEvent(BASE, 'GARBAGE', 'citizen-2');

    expect(secondId).not.toBe(firstId);
  });

  it('a same-category report outside the radius does NOT merge', async () => {
    const firstId = await postEvent(BASE, 'POTHOLE', 'citizen-1');
    const secondId = await postEvent(FAR, 'POTHOLE', 'citizen-2');

    expect(secondId).not.toBe(firstId);
  });
});

describe('POST /v1/events GPS validation', () => {
  it('rejects coordinates far outside the Bangalore metro area with 400', async () => {
    const token = await mintToken('citizen');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      // New Delhi — nowhere near Bangalore, but a valid lat/lng in isolation (would pass the
      // plain -90..90/-180..180 range check, only the metro-bounds refine catches this).
      payload: { latitude: 28.6139, longitude: 77.209, category: 'POTHOLE' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /v1/events wardId filtering', () => {
  // Own buildApp() instance — same rate-limit-budget reason as the other dedicated-app
  // blocks. See docs/architecture/IMPLEMENTATION_NOTES.md#rate-limiting.
  //
  // Coordinates verified by point-in-polygon against wards/bbmp-wards.json directly (not
  // guessed): INSIDE_WARD_2 is the ward-2 (Chowdeswari Ward) polygon's own average-vertex
  // point, confirmed inside; OUTSIDE_WARD_2 is an MG Road coordinate, confirmed outside it.
  let wardApp: FastifyInstance;
  const wardEventIds: string[] = [];
  const WARD_ID = 2;
  const INSIDE_WARD_2 = { latitude: 13.11348, longitude: 77.58103 };
  const OUTSIDE_WARD_2 = { latitude: 12.9758, longitude: 77.6045 };

  beforeAll(async () => {
    wardApp = buildApp();
    await wardApp.ready();
    const tokenRes = await wardApp.inject({ method: 'POST', url: '/dev/token', payload: { role: 'citizen' } });
    const token = JSON.parse(tokenRes.body).token;

    for (const coords of [INSIDE_WARD_2, OUTSIDE_WARD_2]) {
      const res = await wardApp.inject({
        method: 'POST',
        url: '/v1/events',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...coords, category: 'POTHOLE' },
      });
      wardEventIds.push(JSON.parse(res.body).event_id);
    }
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { id: { in: wardEventIds } } });
    await wardApp.close();
  });

  it('includes the event inside the ward and excludes the one outside it', async () => {
    const res = await wardApp.inject({ method: 'GET', url: `/v1/events?wardId=${WARD_ID}&limit=100` });
    expect(res.statusCode).toBe(200);
    const ids = JSON.parse(res.body).events.map((e: { id: string }) => e.id);
    expect(ids).toContain(wardEventIds[0]); // INSIDE_WARD_2
    expect(ids).not.toContain(wardEventIds[1]); // OUTSIDE_WARD_2
  });

  it('an unknown ward id returns an empty list, not an error (undigitized boundary, not a caller mistake)', async () => {
    const res = await wardApp.inject({ method: 'GET', url: '/v1/events?wardId=999999' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).events).toEqual([]);
  });

  it('rejects wardId combined with bbox with 400', async () => {
    const res = await wardApp.inject({ method: 'GET', url: `/v1/events?wardId=${WARD_ID}&bbox=77.55,12.85,77.65,12.95` });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/events/playback', () => {
  it('returns events within the time window in ascending created_at order', async () => {
    const token = await mintToken('citizen');
    const first = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { latitude: 12.93, longitude: 77.61, category: 'GARBAGE' },
    });
    const firstId = JSON.parse(first.body).event_id;
    createdEventIds.push(firstId);

    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();
    const res = await app.inject({ method: 'GET', url: `/v1/events/playback?from=${from}&to=${to}` });
    expect(res.statusCode).toBe(200);
    const { events } = JSON.parse(res.body);
    expect(events.map((e: { id: string }) => e.id)).toContain(firstId);
  });

  it('rejects "to" before "from" with 400', async () => {
    const to = new Date(Date.now() - 60_000).toISOString();
    const from = new Date().toISOString();
    const res = await app.inject({ method: 'GET', url: `/v1/events/playback?from=${from}&to=${to}` });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a window wider than 30 days with 400', async () => {
    const from = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();
    const res = await app.inject({ method: 'GET', url: `/v1/events/playback?from=${from}&to=${to}` });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/events/heatmap', () => {
  it('returns weighted points in the documented shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/events/heatmap?zoom=10' });
    expect(res.statusCode).toBe(200);
    const { points } = JSON.parse(res.body);
    expect(Array.isArray(points)).toBe(true);
    if (points.length > 0) {
      expect(points[0]).toHaveProperty('latitude');
      expect(points[0]).toHaveProperty('longitude');
      expect(points[0]).toHaveProperty('weight');
    }
  });

  it('rejects a missing zoom with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/events/heatmap' });
    expect(res.statusCode).toBe(400);
  });
});
