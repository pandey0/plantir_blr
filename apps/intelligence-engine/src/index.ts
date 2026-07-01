import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { z } from 'zod';
import { PrismaClient, EventCategory, EventStatus } from '@prisma/client';
import { fetchLiveArrivals, calculateFare } from './transit.js';

const fastify = Fastify({
  logger: true,
});

const prisma = new PrismaClient();
const connections = new Set<any>();

fastify.register(cors);
fastify.register(websocket);

// WebSocket Broadcast Hub
fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });
});

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

// EVENT LOGIC (Existing)
fastify.get('/events', async () => {
  return await prisma.event.findMany({
    where: { status: { not: 'FRAUD' } },
    orderBy: { created_at: 'desc' }
  });
});

fastify.patch('/events/:id/status', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { status } = request.body as { status: EventStatus };
  const updated = await prisma.event.update({ where: { id }, data: { status } });
  return updated;
});

function broadcast(payload: object) {
  const msg = JSON.stringify(payload);
  for (const socket of connections) {
    try { socket.send(msg); } catch (_) {}
  }
}

fastify.post('/report', async (request, reply) => {
  const { latitude, longitude, category, location } = request.body as any;
  const ev = await prisma.event.create({ data: { category, status: 'REPORTED', confidence_score: 10 } });

  broadcast({
    type: 'NEW_EVENT',
    payload: {
      id: ev.id,
      type: category,
      location: location || 'Unknown',
      latitude,
      longitude,
      status: 'REPORTED',
      confidence_score: 10,
      created_at: ev.created_at,
    }
  });

  return { success: true, event_id: ev.id };
});

// Dev-only: inject a fake event to test the WS pipeline
fastify.post('/dev/inject', async (request, reply) => {
  const CATEGORIES = ['POTHOLE', 'GARBAGE', 'WATER_LOGGING', 'TRAFFIC_INCIDENT', 'STREET_LIGHT_FAILURE'];
  const LOCATIONS = ['Koramangala', 'Indiranagar', 'Whitefield', 'Hebbal', 'Jayanagar', 'Majestic', 'BTM Layout'];
  const BLR_BOUNDS = { latMin: 12.85, latMax: 13.07, lngMin: 77.47, lngMax: 77.75 };

  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const latitude = BLR_BOUNDS.latMin + Math.random() * (BLR_BOUNDS.latMax - BLR_BOUNDS.latMin);
  const longitude = BLR_BOUNDS.lngMin + Math.random() * (BLR_BOUNDS.lngMax - BLR_BOUNDS.lngMin);

  const ev = await prisma.event.create({ data: { category: category as any, status: 'REPORTED', confidence_score: 10 } });

  broadcast({
    type: 'NEW_EVENT',
    payload: { id: ev.id, type: category, location, latitude, longitude, status: 'REPORTED', confidence_score: 10, created_at: ev.created_at }
  });

  return { injected: true, event_id: ev.id, category, location };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Intelligence Engine (Full Transit Intel) running on port 3001');
  } catch (err) {
    process.exit(1);
  }
};

start();
