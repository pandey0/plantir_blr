import { defineConfig } from 'vitest/config';

// Unit tier only — no DB required. See vitest.integration.config.ts for the
// DB-dependent tier, and docs/architecture/TESTING.md for why they're split.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
});
