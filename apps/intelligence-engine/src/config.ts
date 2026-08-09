import { z } from 'zod';

// Scoped to env vars OUR code reads directly. Deliberately does NOT include DATABASE_URL —
// Prisma's generated client loads that itself from packages/database/.env (a path baked in at
// `prisma generate` time, see node_modules/.prisma/client/index.js's `schemaEnvPath`), not from
// process.env populated ahead of time. Adding it here would either fail before Prisma's own
// lazy-load runs (if this module imports before db.ts does) or just duplicate that logic for no
// benefit. See docs/architecture/IMPLEMENTATION_NOTES.md.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
  // plantir-blr-data-service (sibling repo, FastAPI) — transit arrivals/fare estimates.
  // Defaults to local dev; no production default because there's no deployed instance yet.
  DATA_SERVICE_URL: z.string().url().optional(),
});

export interface Config {
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  jwtSecret: string | undefined;
  corsOrigins: string[];
  dataServiceUrl: string;
}

export type ConfigResult = { success: true; config: Config } | { success: false; error: string };

// Pure — no I/O, no process.exit — so this is unit-testable independent of the fail-fast side
// effects below. Per docs/standards/backend-engineering-standards.md Section 26: "Validate
// environment variables at startup," not lazily whenever some handler happens to touch one.
export function buildConfig(env: NodeJS.ProcessEnv): ConfigResult {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
  }

  const isProduction = parsed.data.NODE_ENV === 'production';
  if (isProduction && !parsed.data.JWT_SECRET) {
    return { success: false, error: 'JWT_SECRET must be set in production' };
  }

  return {
    success: true,
    config: {
      nodeEnv: parsed.data.NODE_ENV,
      isProduction,
      jwtSecret: parsed.data.JWT_SECRET,
      corsOrigins: (parsed.data.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002,http://localhost:3003')
        .split(',')
        .map((origin) => origin.trim()),
      dataServiceUrl: parsed.data.DATA_SERVICE_URL ?? 'http://localhost:8000',
    },
  };
}

function loadConfig(): Config {
  const result = buildConfig(process.env);
  if (!result.success) {
    console.error(`Invalid environment configuration: ${result.error}`);
    process.exit(1);
  }
  return result.config;
}

export const config = loadConfig();
