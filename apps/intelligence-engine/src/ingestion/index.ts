import { z } from 'zod';
import { EventCategory } from '@prisma/client';
import { createEvent } from '../events/index.js';

export interface EventInput {
  category: EventCategory;
  latitude: number;
  longitude: number;
  location?: string;
  reporterId?: string;
  mediaUrls?: string[];
}

export interface Source {
  id: string;
  trustWeight: number;
  /** Validates + shapes raw input. Throws (Zod's ZodError) on bad input — callers handle it. */
  normalize(raw: unknown): EventInput;
}

const citizenReportBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.nativeEnum(EventCategory),
  location: z.string().optional(),
});

export const citizenReportSource: Source = {
  id: 'citizen-report',
  trustWeight: 1,
  normalize(raw: unknown): EventInput {
    return citizenReportBodySchema.parse(raw);
  },
};

export async function ingestEvent(source: Source, raw: unknown) {
  const input = source.normalize(raw);
  return createEvent({
    category: input.category,
    latitude: input.latitude,
    longitude: input.longitude,
    location: input.location,
    source: { id: source.id, trustWeight: source.trustWeight },
  });
}
