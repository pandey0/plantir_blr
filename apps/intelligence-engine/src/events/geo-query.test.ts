import { describe, it, expect } from 'vitest';
import { gridSizeMeters } from './geo-query.js';

// gridSizeMeters() is pure — no DB touches this file (importing this module transitively
// imports db.js, which only instantiates a lazy-connect PrismaClient, same precedent as
// ingestion/index.test.ts). Actual clustering query behavior is integration-tested.

describe('gridSizeMeters', () => {
  it('reproduces the 4 reference points from docs/product/VISION.md exactly', () => {
    expect(gridSizeMeters(5)).toBe(1000);
    expect(gridSizeMeters(10)).toBe(300);
    expect(gridSizeMeters(14)).toBe(80);
    expect(gridSizeMeters(17)).toBeNull();
  });

  it('is a step function, not an interpolation, between reference points', () => {
    expect(gridSizeMeters(9)).toBe(1000); // just below the zoom-10 breakpoint
    expect(gridSizeMeters(13)).toBe(300); // just below the zoom-14 breakpoint
    expect(gridSizeMeters(16)).toBe(80); // just below the zoom-17 breakpoint
  });

  it('returns null (no clustering) for any zoom at or above 17', () => {
    expect(gridSizeMeters(17)).toBeNull();
    expect(gridSizeMeters(20)).toBeNull();
    expect(gridSizeMeters(22)).toBeNull();
  });

  it('returns the coarsest grid for very low zoom', () => {
    expect(gridSizeMeters(1)).toBe(1000);
  });
});
