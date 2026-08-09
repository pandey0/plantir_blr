import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { citizenReportSource } from './index.js';

// Pure unit tests — only exercises normalize(), never ingestEvent()/createEvent(), so no DB
// touches this file. See docs/architecture/TESTING.md for the unit/integration split.

describe('citizenReportSource', () => {
  it('has the identity events/README.md and DATA_FLOW.md document', () => {
    expect(citizenReportSource.id).toBe('citizen-report');
    expect(citizenReportSource.trustWeight).toBe(1);
  });

  it('normalizes a valid report body', () => {
    const input = citizenReportSource.normalize({
      latitude: 12.9172,
      longitude: 77.6228,
      category: 'POTHOLE',
      location: 'Silk Board',
    });

    expect(input).toEqual({
      latitude: 12.9172,
      longitude: 77.6228,
      category: 'POTHOLE',
      location: 'Silk Board',
    });
  });

  it('allows location to be omitted', () => {
    const input = citizenReportSource.normalize({
      latitude: 12.9172,
      longitude: 77.6228,
      category: 'GARBAGE',
    });

    expect(input.location).toBeUndefined();
  });

  it('throws ZodError on a missing required field', () => {
    expect(() =>
      citizenReportSource.normalize({ longitude: 77.6228, category: 'POTHOLE' }),
    ).toThrow(z.ZodError);
  });

  it('throws on an invalid category', () => {
    expect(() =>
      citizenReportSource.normalize({
        latitude: 12.9172,
        longitude: 77.6228,
        category: 'NOT_A_REAL_CATEGORY',
      }),
    ).toThrow(z.ZodError);
  });

  it.each([
    ['latitude', { latitude: 91, longitude: 77.6, category: 'POTHOLE' }],
    ['latitude', { latitude: -91, longitude: 77.6, category: 'POTHOLE' }],
    ['longitude', { latitude: 12.9, longitude: 181, category: 'POTHOLE' }],
    ['longitude', { latitude: 12.9, longitude: -181, category: 'POTHOLE' }],
  ])('rejects out-of-range %s', (_field, raw) => {
    expect(() => citizenReportSource.normalize(raw)).toThrow(z.ZodError);
  });
});
