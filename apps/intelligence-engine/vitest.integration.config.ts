import { defineConfig } from 'vitest/config';

// Integration tier — requires a live, migrated Postgres (npm run infra:up + db:migrate).
// Not run in pre-commit. See docs/architecture/TESTING.md.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
  },
});
