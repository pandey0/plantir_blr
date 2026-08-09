import { buildApp } from './app.js';

const fastify = buildApp();

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Intelligence Engine (Full Transit Intel) running on port 3001');
  } catch (err) {
    process.exit(1);
  }
};

start();
