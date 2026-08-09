import type { FastifyReply } from 'fastify';

// Standardized API error response shape, per docs/standards/backend-engineering-standards.md
// Section 13: `{ error: { code, message } }`, never a bare string or a raw Zod error object.
// `details` carries the Zod flatten() output for validation failures — useful for a client
// building form errors, safe to expose since it only echoes back the caller's own bad input,
// never internal state.
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): FastifyReply {
  return reply.status(statusCode).send({
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}
