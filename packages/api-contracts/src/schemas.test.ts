import { describe, it, expect } from 'vitest';
import {
  eventCategorySchema,
  eventStatusSchema,
  createEventRequestSchema,
  listEventsRequestSchema,
  updateEventStatusRequestSchema,
  getArrivalsRequestSchema,
  getFareEstimateRequestSchema,
  getEventClustersRequestSchema,
} from './schemas.js';
import { EventCategory, EventStatus } from './generated/plantir/events/v1/event.js';
import { TransitMode } from './generated/plantir/transit/v1/arrival.js';

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

  it('parses a valid bbox into its four components', () => {
    const result = listEventsRequestSchema.parse({ bbox: '77.4,12.8,77.8,13.1' });
    expect(result.bbox).toEqual({ minLng: 77.4, minLat: 12.8, maxLng: 77.8, maxLat: 13.1 });
  });

  it('rejects a bbox with the wrong number of components', () => {
    expect(listEventsRequestSchema.safeParse({ bbox: '77.4,12.8,77.8' }).success).toBe(false);
  });

  it('rejects a bbox where min >= max', () => {
    expect(listEventsRequestSchema.safeParse({ bbox: '77.8,12.8,77.4,13.1' }).success).toBe(false);
  });

  it('rejects a bbox with out-of-range coordinates', () => {
    expect(listEventsRequestSchema.safeParse({ bbox: '-200,12.8,77.8,13.1' }).success).toBe(false);
  });

  it('accepts a valid radius query', () => {
    const result = listEventsRequestSchema.parse({ lat: '12.9', lng: '77.6', radiusKm: '5' });
    expect(result).toMatchObject({ lat: 12.9, lng: 77.6, radiusKm: 5 });
  });

  it('rejects radiusKm above the 50km cap', () => {
    expect(listEventsRequestSchema.safeParse({ lat: 12.9, lng: 77.6, radiusKm: 51 }).success).toBe(false);
  });

  it('rejects bbox combined with a radius query', () => {
    const result = listEventsRequestSchema.safeParse({ bbox: '77.4,12.8,77.8,13.1', lat: 12.9, lng: 77.6, radiusKm: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects a partial radius query (missing radiusKm)', () => {
    expect(listEventsRequestSchema.safeParse({ lat: 12.9, lng: 77.6 }).success).toBe(false);
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

describe('getArrivalsRequestSchema', () => {
  it('accepts a valid station/mode', () => {
    expect(getArrivalsRequestSchema.safeParse({ station: 'MG Road', mode: TransitMode.METRO }).success).toBe(true);
  });

  it('rejects an empty station', () => {
    expect(getArrivalsRequestSchema.safeParse({ station: '', mode: TransitMode.METRO }).success).toBe(false);
  });

  it('rejects an invalid mode', () => {
    expect(getArrivalsRequestSchema.safeParse({ station: 'MG Road', mode: 'TRAIN' }).success).toBe(false);
  });
});

describe('getFareEstimateRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(
      getFareEstimateRequestSchema.safeParse({ from: 'Majestic', to: 'Whitefield', mode: TransitMode.BUS }).success,
    ).toBe(true);
  });

  it('rejects a missing "to"', () => {
    expect(getFareEstimateRequestSchema.safeParse({ from: 'Majestic', mode: TransitMode.BUS }).success).toBe(false);
  });
});

describe('getEventClustersRequestSchema', () => {
  it('accepts a valid zoom with no bbox', () => {
    const result = getEventClustersRequestSchema.safeParse({ zoom: '14' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid zoom with a bbox', () => {
    const result = getEventClustersRequestSchema.safeParse({ zoom: 14, bbox: '77.4,12.8,77.8,13.1' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing zoom', () => {
    expect(getEventClustersRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects zoom below 1 or above 22', () => {
    expect(getEventClustersRequestSchema.safeParse({ zoom: 0 }).success).toBe(false);
    expect(getEventClustersRequestSchema.safeParse({ zoom: 23 }).success).toBe(false);
  });
});
