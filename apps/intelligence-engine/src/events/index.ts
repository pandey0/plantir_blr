import type { Event, EventCategory, EventStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { broadcast } from '../ws/index.js';

export interface CreateEventInput {
  category: EventCategory;
  latitude: number;
  longitude: number;
  location?: string;
  source: { id: string; trustWeight: number };
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  // Confidence scoring (see README.md) is PLANNED, not implemented — `source.trustWeight`
  // is accepted for interface forward-compat but unused. Score is hardcoded until it lands.
  const ev = await prisma.event.create({
    data: {
      category: input.category,
      status: 'REPORTED',
      confidence_score: 10,
    },
  });
  // geom has no first-class Prisma field (see schema.prisma comment) — written via raw SQL.
  await prisma.$executeRaw`UPDATE "Event" SET geom = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326) WHERE id = ${ev.id}`;

  broadcast({
    type: 'NEW_EVENT',
    payload: {
      id: ev.id,
      type: ev.category,
      location: input.location ?? 'Unknown',
      latitude: input.latitude,
      longitude: input.longitude,
      status: ev.status,
      confidence_score: ev.confidence_score,
      created_at: ev.created_at,
    },
  });

  return ev;
}

export async function updateStatus(eventId: string, status: EventStatus): Promise<Event> {
  // Deliberately does not broadcast (unlike createEvent). A status-change WS message is a
  // new payload shape public-map doesn't handle today, and this app is intentionally being
  // built in isolation from the frontends right now (see docs/architecture/OVERVIEW.md).
  // Wiring this up is a real gap (see docs/product/VISION.md's Real-Time Update System),
  // deferred rather than missed — needs a public-map-side change to land alongside it.
  return prisma.event.update({ where: { id: eventId }, data: { status } });
}
