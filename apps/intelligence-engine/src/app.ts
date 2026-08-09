import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import {
  EventCategory,
  createEventRequestSchema,
  listEventsRequestSchema,
  updateEventStatusRequestSchema,
  getArrivalsRequestSchema,
  getFareEstimateRequestSchema,
  getEventClustersRequestSchema,
  getHeatmapRequestSchema,
  getPlaybackRequestSchema,
} from '@plantir/api-contracts';
import { fetchLiveArrivals, getFareEstimate } from './transit.js';
import { registerWsHub } from './ws/index.js';
import {
  createEvent,
  updateStatus,
  listEvents,
  listEventsInRange,
  EventNotFoundError,
  InvalidStatusTransitionError,
} from './events/index.js';
import {
  findEventIdsInBbox,
  findEventIdsInRadius,
  findEventIdsInWard,
  findEventClusters,
  getHeatmapPoints,
} from './events/geo-query.js';
import { getOrFetch, cacheKey } from './events/list-cache.js';
import { ingestEvent, citizenReportSource } from './ingestion/index.js';
import { checkIdempotency, recordIdempotency } from './events/idempotency.js';
import { routeManifest, type Role } from './routes/manifest.js';
import { sendError } from './errors.js';
import { config } from './config.js';

type Handler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

// Separated from index.ts's listen() call per Fastify's own testing pattern —
// tests call buildApp() and use fastify.inject(), which needs no bound port.
export function buildApp(): FastifyInstance {
  const fastify = Fastify({ logger: true });

  const isProduction = config.isProduction;

  fastify.register(cors, { origin: config.corsOrigins });
  // Defaults are fine for a pure JSON/WS API (no HTML served) — no CSP tuning needed here.
  fastify.register(helmet);
  fastify.register(websocket);
  // global: false — most routes (reads, transit's mocked data) don't need limiting; only
  // routes carrying a `rateLimit` entry in the manifest opt in via their route `config`.
  fastify.register(rateLimit, { global: false });

  // config.ts already fails fast at process startup if JWT_SECRET is missing in production
  // (see docs/architecture/IMPLEMENTATION_NOTES.md) — this is just the dev-mode heads-up.
  if (!config.jwtSecret) {
    fastify.log.warn('JWT_SECRET not set — using an insecure dev default. Set JWT_SECRET before deploying.');
  }
  fastify.register(jwt, { secret: config.jwtSecret ?? 'dev-only-insecure-secret-change-me' });

  function requireRole(roles: Role[]) {
    return async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch {
        return sendError(reply, 401, 'UNAUTHORIZED', 'Unauthorized');
      }
      const role = (request.user as { role?: Role })?.role;
      if (!role || !roles.includes(role)) {
        return sendError(reply, 403, 'FORBIDDEN', 'Forbidden');
      }
    };
  }

  // Safety net for anything NOT explicitly caught in a handler — per
  // docs/standards/backend-engineering-standards.md Section 13, never leak internal error
  // messages/stack traces to the client. Known 4xx from trusted plugins (e.g. @fastify/jwt's
  // 401, @fastify/rate-limit's 429) pass their own message through wrapped in our shape — that
  // message is plugin-authored, not internal state. Anything >=500 gets logged in full
  // server-side and replaced with a generic client-facing message.
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      fastify.log.error(error);
      return sendError(reply, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
    return sendError(reply, statusCode, error.code ?? 'ERROR', error.message);
  });

  registerWsHub(fastify);

  const idParamsSchema = z.object({ id: z.string().uuid() });

  const handlers: Record<string, Handler> = {
    Health: async () => ({ status: 'ok' }),

    ListEvents: async (request, reply) => {
      const parsed = listEventsRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      const { cursor, limit, bbox, lat, lng, radiusKm, wardId } = parsed.data;

      // Coalesces concurrent identical queries + short TTL cache — invalidated on every write,
      // not left to expire, so this never serves stale-after-your-own-write data. See list-cache.ts.
      return getOrFetch(cacheKey({ cursor, limit, bbox, lat, lng, radiusKm, wardId }), async () => {
        let idFilter: string[] | undefined;
        if (bbox) {
          idFilter = await findEventIdsInBbox(bbox);
        } else if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
          idFilter = await findEventIdsInRadius(lat, lng, radiusKm);
        } else if (wardId !== undefined) {
          idFilter = await findEventIdsInWard(wardId);
        }
        // The actual query lives in events/index.ts's listEvents() — this handler's job is
        // HTTP glue only (parse query, resolve spatial filter, shape response), never a direct
        // Prisma call. See docs/architecture/STANDARDS_COMPLIANCE.md.
        return listEvents({ cursor, limit, idFilter });
      });
    },

    GetEventClusters: async (request, reply) => {
      const parsed = getEventClustersRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      const { zoom, bbox } = parsed.data;

      // Shares the same cache/invalidation infrastructure as ListEvents — a new event changes
      // cluster counts too, so it must invalidate on the same writes. Distinct key prefix
      // ("clusters:") keeps it from ever colliding with a ListEvents cache entry.
      return getOrFetch(`clusters:${JSON.stringify({ zoom, bbox: bbox ?? null })}`, async () => {
        const clusters = await findEventClusters(zoom, bbox);
        return { clusters };
      });
    },

    GetHeatmap: async (request, reply) => {
      const parsed = getHeatmapRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      const { zoom, bbox } = parsed.data;

      // Same cache infrastructure as GetEventClusters, distinct key prefix — see
      // getHeatmapPoints()'s doc comment for why this deliberately reuses cluster aggregation.
      return getOrFetch(`heatmap:${JSON.stringify({ zoom, bbox: bbox ?? null })}`, async () => {
        const points = await getHeatmapPoints(zoom, bbox);
        return { points };
      });
    },

    GetEventsPlayback: async (request, reply) => {
      const parsed = getPlaybackRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      const { from, to, bbox } = parsed.data;

      // Not behind the request-coalescing cache: unlike the live feed/clusters, a playback
      // window is a comparatively rare, wide, ad hoc query (arbitrary from/to) rather than a
      // small set of viewport-driven queries repeated by many concurrent clients — caching it
      // would mostly cache one-off entries the TTL never gets to reuse.
      const idFilter = bbox ? await findEventIdsInBbox(bbox) : undefined;
      const events = await listEventsInRange({ from, to, idFilter });
      return { events };
    },

    CreateEvent: async (request, reply) => {
      // Idempotency-Key (optional, standard header name — see Stripe/Slack/etc. convention).
      // Capped at 200 chars: a client-supplied header used only as a Map key has no reason to
      // be arbitrarily long, and an unbounded value is a cheap memory-abuse vector.
      const idempotencyKeyHeader = request.headers['idempotency-key'];
      const idempotencyKey = typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader : undefined;
      if (idempotencyKey !== undefined && (idempotencyKey.length === 0 || idempotencyKey.length > 200)) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Idempotency-Key must be 1-200 characters');
      }

      if (idempotencyKey) {
        const lookup = checkIdempotency(idempotencyKey, request.body);
        if (lookup.kind === 'conflict') {
          return sendError(reply, 422, 'IDEMPOTENCY_KEY_CONFLICT', 'Idempotency-Key was already used with a different request body');
        }
        if (lookup.kind === 'replay') {
          reply.code(lookup.statusCode);
          return lookup.body;
        }
      }

      try {
        const ev = await ingestEvent(citizenReportSource, request.body);
        const result = { success: true, event_id: ev.id };
        // Only successful creates are cached for replay — a validation failure should let the
        // client retry with a fixed body under the same key without being permanently stuck
        // replaying the same 400.
        if (idempotencyKey) recordIdempotency(idempotencyKey, request.body, 200, result);
        return result;
      } catch (err) {
        if (err instanceof z.ZodError) {
          return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', err.flatten());
        }
        throw err;
      }
    },

    UpdateEventStatus: async (request, reply) => {
      const paramsParsed = idParamsSchema.safeParse(request.params);
      const bodyParsed = updateEventStatusRequestSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request', {
          params: paramsParsed.success ? undefined : paramsParsed.error.flatten(),
          body: bodyParsed.success ? undefined : bodyParsed.error.flatten(),
        });
      }
      try {
        return await updateStatus(paramsParsed.data.id, bodyParsed.data.status);
      } catch (err) {
        if (err instanceof EventNotFoundError) return sendError(reply, 404, 'EVENT_NOT_FOUND', err.message);
        if (err instanceof InvalidStatusTransitionError) return sendError(reply, 409, 'INVALID_STATUS_TRANSITION', err.message);
        throw err;
      }
    },

    GetArrivals: async (request, reply) => {
      const parsed = getArrivalsRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      return fetchLiveArrivals(parsed.data.station, parsed.data.mode);
    },

    GetFareEstimate: async (request, reply) => {
      const parsed = getFareEstimateRequestSchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten());
      return getFareEstimate(parsed.data.from, parsed.data.to, parsed.data.mode);
    },

    DevIssueToken: async (request, reply) => {
      const { role } = (request.body as { role?: Role }) ?? {};
      if (role !== 'citizen' && role !== 'authority') {
        return sendError(reply, 400, 'VALIDATION_ERROR', "role must be 'citizen' or 'authority'");
      }
      const token = fastify.jwt.sign({ role }, { expiresIn: '2h' });
      return { token };
    },

    // Bypasses ingestion/ — it already produces normalized, valid random data, there's no
    // raw input to shape.
    DevInjectEvent: async () => {
      const CATEGORIES = [
        EventCategory.POTHOLE,
        EventCategory.GARBAGE,
        EventCategory.WATER_LOGGING,
        EventCategory.TRAFFIC_INCIDENT,
        EventCategory.STREET_LIGHT_FAILURE,
      ];
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
        // Synthetic reporter so injected events aren't all stuck at 0 confidence — this tool
        // exists to make the dev experience realistic, a plausible score included.
        reporterId: `dev-inject-${Math.random().toString(36).slice(2, 10)}`,
        source: { id: 'dev-inject', trustWeight: 0 },
      });

      return { injected: true, event_id: ev.id, category, location };
    },
  };

  // Manifest-driven registration — see routes/README.md and routes/manifest.ts.
  // Wrapped in fastify.after(): @fastify/rate-limit's per-route config (routeOpts.config.rateLimit
  // below) is picked up by an 'onRoute' hook the plugin installs during its own async registration.
  // Declaring routes synchronously right after `fastify.register(rateLimit, ...)` — without this —
  // races that hook: the route gets declared before the plugin has finished loading, so the hook
  // never sees it and the rate limit is silently never applied (no error, just doesn't work).
  // fastify.after() guarantees this callback runs once every plugin registered above has loaded.
  fastify.after(() => {
    for (const entry of routeManifest) {
      if (entry.devOnly && isProduction) continue;
      const routeOpts = {
        ...(entry.auth === 'none' ? {} : { preHandler: requireRole(entry.auth) }),
        ...(entry.rateLimit ? { config: { rateLimit: entry.rateLimit } } : {}),
      };
      const method = entry.method.toLowerCase() as 'get' | 'post' | 'patch';
      fastify[method](entry.path, routeOpts, handlers[entry.rpc]);
    }
  });

  return fastify;
}
