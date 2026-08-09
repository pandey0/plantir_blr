import { createEventRequestSchema, type EventCategory } from '@plantir/api-contracts';
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

export const citizenReportSource: Source = {
  id: 'citizen-report',
  trustWeight: 1,
  normalize(raw: unknown): EventInput {
    // Shared with packages/api-contracts' future /v1 consumers — one schema, not a
    // duplicate hand-written one. See that package's README.md.
    return createEventRequestSchema.parse(raw);
  },
};

export async function ingestEvent(source: Source, raw: unknown) {
  const input = source.normalize(raw);
  return createEvent({
    category: input.category,
    latitude: input.latitude,
    longitude: input.longitude,
    location: input.location,
    reporterId: input.reporterId,
    mediaUrls: input.mediaUrls,
    source: { id: source.id, trustWeight: source.trustWeight },
  });
}
