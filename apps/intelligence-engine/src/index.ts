import { buildApp } from './app.js';
import { prisma } from './db.js';

const fastify = buildApp();

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Intelligence Engine (Full Transit Intel) running on port 3001');
  } catch (err) {
    process.exit(1);
  }
};

// Graceful shutdown — docs/standards/backend-engineering-standards.md Section 23: stop
// accepting new connections and let in-flight requests finish (fastify.close()) before closing
// the DB pool, rather than the process dying mid-request when an orchestrator sends SIGTERM.
// Not automated-tested — signal handling isn't practical to assert on in vitest; verified
// manually (start the dev server, send SIGTERM, confirm clean exit and no dangling connection).
async function shutdown(signal: string) {
  fastify.log.info(`${signal} received, shutting down gracefully`);
  try {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
