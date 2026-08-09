import { z } from 'zod';
import { EventCategory, EventStatus } from './generated/plantir/events/v1/event.js';
import { TransitMode } from './generated/plantir/transit/v1/arrival.js';

// Zod schemas for the *future* /v1 routes, built on the generated proto enums so
// there's exactly one definition of valid category/status values. Not wired into
// apps/intelligence-engine's current unversioned routes yet — see this package's
// README.md for why, and docs/architecture/TECH_STACK.md for the migration plan.

export const eventCategorySchema = z.nativeEnum(EventCategory);
export const eventStatusSchema = z.nativeEnum(EventStatus);
export const transitModeSchema = z.nativeEnum(TransitMode);

export const createEventRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: eventCategorySchema,
  location: z.string().optional(),
});

export const listEventsRequestSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateEventStatusRequestSchema = z.object({
  status: eventStatusSchema,
});
