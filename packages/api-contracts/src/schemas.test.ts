import { describe, it, expect } from 'vitest';
import {
  eventCategorySchema,
  eventStatusSchema,
  createEventRequestSchema,
  listEventsRequestSchema,
  updateEventStatusRequestSchema,
} from './schemas.js';
import { EventCategory, EventStatus } from './generated/plantir/events/v1/event.js';

describe('eventCategorySchema / eventStatusSchema', () => {
  it('accepts every generated enum value', () => {
    for (const value of Object.values(EventCategory)) {
      expect(eventCategorySchema.safeParse(value).success).toBe(true);
    }
    for (const value of Object.values(EventStatus)) {
      expect(eventStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects an arbitrary string', () => {
    expect(eventCategorySchema.safeParse('NOT_A_CATEGORY').success).toBe(false);
  });
});

describe('createEventRequestSchema', () => {
  it('parses a valid request', () => {
    const result = createEventRequestSchema.safeParse({
      latitude: 12.9,
      longitude: 77.6,
      category: EventCategory.POTHOLE,
    });
    expect(result.success).toBe(true);
  });

  it('rejects latitude/longitude outside valid range', () => {
    expect(
      createEventRequestSchema.safeParse({ latitude: 200, longitude: 77.6, category: EventCategory.POTHOLE }).success,
    ).toBe(false);
  });
});

describe('listEventsRequestSchema', () => {
  it('defaults limit to 50 when omitted', () => {
    const result = listEventsRequestSchema.parse({});
    expect(result.limit).toBe(50);
  });

  it('coerces a string query-param limit to a number', () => {
    const result = listEventsRequestSchema.parse({ limit: '25' });
    expect(result.limit).toBe(25);
  });

  it('rejects limit above 100', () => {
    expect(listEventsRequestSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('rejects a non-UUID cursor', () => {
    expect(listEventsRequestSchema.safeParse({ cursor: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('updateEventStatusRequestSchema', () => {
  it('accepts a valid status', () => {
    expect(updateEventStatusRequestSchema.safeParse({ status: EventStatus.RESOLVED }).success).toBe(true);
  });

  it('rejects a missing status', () => {
    expect(updateEventStatusRequestSchema.safeParse({}).success).toBe(false);
  });
});
