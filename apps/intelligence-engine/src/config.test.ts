import { describe, it, expect } from 'vitest';
import { buildConfig } from './config.js';

// buildConfig() is pure (no I/O, no process.exit) specifically so it's unit-testable — the
// fail-fast side effects live in config.ts's untested-by-design loadConfig() wrapper.

describe('buildConfig', () => {
  it('defaults NODE_ENV to development and CORS_ORIGINS to the three local frontend ports', () => {
    const result = buildConfig({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.nodeEnv).toBe('development');
      expect(result.config.isProduction).toBe(false);
      expect(result.config.corsOrigins).toEqual([
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3003',
      ]);
    }
  });

  it('allows a missing JWT_SECRET in development', () => {
    const result = buildConfig({ NODE_ENV: 'development' });
    expect(result.success).toBe(true);
  });

  it('fails when JWT_SECRET is missing in production', () => {
    const result = buildConfig({ NODE_ENV: 'production' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('JWT_SECRET');
    }
  });

  it('succeeds in production when JWT_SECRET is set', () => {
    const result = buildConfig({ NODE_ENV: 'production', JWT_SECRET: 'a-real-secret' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.isProduction).toBe(true);
      expect(result.config.jwtSecret).toBe('a-real-secret');
    }
  });

  it('rejects an invalid NODE_ENV value', () => {
    const result = buildConfig({ NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });

  it('splits and trims CORS_ORIGINS', () => {
    const result = buildConfig({ CORS_ORIGINS: 'http://a.com, http://b.com ,http://c.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.corsOrigins).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
    }
  });
});
