import type { FastifyInstance } from 'fastify';

// Per-process only — see README.md "Scaling ceiling" before adding a second engine instance.
const connections = new Set<any>();

export function registerWsHub(fastify: FastifyInstance): void {
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      connections.add(socket);
      socket.on('close', () => connections.delete(socket));
    });
  });
}

export function broadcast(payload: object): void {
  const msg = JSON.stringify(payload);
  for (const socket of connections) {
    try { socket.send(msg); } catch (_) {}
  }
}
