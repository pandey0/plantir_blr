import { describe, it, expect } from 'vitest';
import { getWardGeometry, wardExists, listWards } from './index.js';

describe('wards', () => {
  it('loads the bundled BBMP ward data and resolves a known ward', () => {
    expect(wardExists(2)).toBe(true);
    const geometry = getWardGeometry(2);
    expect(geometry).toBeDefined();
    expect(geometry?.type).toBe('MultiPolygon');
  });

  it('returns undefined/false for an unknown ward id, not a throw', () => {
    expect(wardExists(999999)).toBe(false);
    expect(getWardGeometry(999999)).toBeUndefined();
  });

  it('listWards() returns every digitized ward with an id and name', () => {
    const wards = listWards();
    expect(wards.length).toBeGreaterThan(0);
    expect(wards.every((w) => typeof w.id === 'number' && typeof w.name === 'string')).toBe(true);
  });
});
