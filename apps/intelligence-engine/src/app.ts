import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { EventCategory, EventStatus } from '@prisma/client';
import { fetchLiveArrivals, calculateFare } from './transit.js';
import { prisma } from './db.js';
import { registerWsHub } from './ws/index.js';
import { createEvent, updateStatus } from './events/index.js';
import { ingestEvent, citizenReportSource } from './ingestion/index.js';

type Role = 'citizen' | 'authority';

// Separated from index.ts's listen() call per Fastify's own testing pattern —
// tests call buildApp() and use fastify.inject(), which needs no bound port.
export function buildApp(): FastifyInstance {
  const fastify = Fastify({ logger: true });

  const isProduction = process.env.NODE_ENV === 'production';

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002,http://localhost:3003')
    .split(',')
    .map((origin) => origin.trim());

  fastify.register(cors, { origin: allowedOrigins });
  fastify.register(websocket);

  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be set in production');
    }
    fastify.log.warn('JWT_SECRET not set — using an insecure dev default. Set JWT_SECRET before deploying.');
  }
  fastify.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me' });

  function requireRole(...roles: Role[]) {
    return async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const role = (request.user as { role?: Role })?.role;
      if (!role || !roles.includes(role)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    };
  }

  fastify.get('/health', async () => ({ status: 'ok' }));

  registerWsHub(fastify);

  // TRANSIT INTEL ENDPOINTS
  fastify.get('/transit/arrivals', async (request, reply) => {
    const { station, mode } = request.query as { station: string, mode: 'METRO' | 'BUS' };
    if (!station || !mode) return reply.status(400).send({ error: 'Missing parameters' });

    const arrivals = await fetchLiveArrivals(station, mode);
    return arrivals;
  });

  fastify.get('/transit/estimate', async (request, reply) => {
    const { from, to, mode } = request.query as { from: string, to: string, mode: 'METRO' | 'BUS' };
    const fare = calculateFare(from, to, mode);
    return { fare, time: '28 mins' };
  });

  // EVENT LOGIC
  const eventsQuerySchema = z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  });

  fastify.get('/events', async (request, reply) => {
    const parsed = eventsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { cursor, limit } = parsed.data;

    const events = await prisma.event.findMany({
      where: { status: { not: 'FRAUD' } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    return { events: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  });

  const statusParamsSchema = z.object({ id: z.string().uuid() });
  const statusBodySchema = z.object({ status: z.nativeEnum(EventStatus) });

  fastify.patch('/events/:id/status', { preHandler: requireRole('authority') }, async (request, reply) => {
    const paramsParsed = statusParamsSchema.safeParse(request.params);
    const bodyParsed = statusBodySchema.safeParse(request.body);
    if (!paramsParsed.success || !bodyParsed.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }
    return updateStatus(paramsParsed.data.id, bodyParsed.data.status);
  });

  fastify.post('/report', { preHandler: requireRole('citizen', 'authority') }, async (request, reply) => {
    try {
      const ev = await ingestEvent(citizenReportSource, request.body);
      return { success: true, event_id: ev.id };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.flatten() });
      }
      throw err;
    }
  });

  // Dev-only routes: not registered at all in production.
  if (!isProduction) {
    fastify.post('/dev/token', async (request, reply) => {
      const { role } = (request.body as { role?: Role }) ?? {};
      if (role !== 'citizen' && role !== 'authority') {
        return reply.status(400).send({ error: "role must be 'citizen' or 'authority'" });
      }
      const token = fastify.jwt.sign({ role }, { expiresIn: '2h' });
      return { token };
    });

    // Dev-only: inject a fake event to test the WS pipeline. Bypasses ingestion/ — it
    // already produces normalized, valid data, there's no raw input to shape.
    fastify.post('/dev/inject', async (request, reply) => {
      const CATEGORIES: EventCategory[] = ['POTHOLE', 'GARBAGE', 'WATER_LOGGING', 'TRAFFIC_INCIDENT', 'STREET_LIGHT_FAILURE'];
      const LOCATIONS = ['Koramangala', 'Indiranagar', 'Whitefield', 'Hebbal', 'Jayanagar', 'Majestic', 'BTM Layout'];
      const BLR_BOUNDS = { latMin: 12.85, latMax: 13.07, lngMin: 77.47, lngMax: 77.75 };

      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      const latitude = BLR_BOUNDS.latMin + Math.random() * (BLR_BOUNDS.latMax - BLR_BOUNDS.latMin);
      const longitude = BLR_BOUNDS.lngMin + Math.random() * (BLR_BOUNDS.lngMax - BLR_BOUNDS.lngMin);

      const ev = await createEvent({
        category,
        latitude,
        longitude,
        location,
        source: { id: 'dev-inject', trustWeight: 0 },
      });

      return { injected: true, event_id: ev.id, category, location };
    });
  }

  return fastify;
}
