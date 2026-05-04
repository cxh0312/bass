import type { Context, Next } from 'hono';
import { db } from '../db.js';

function record(c: Context, statusCode: number, durationMs: number) {
  const projectId = (c.get('projectId') as string) || 'system';
  const endpoint = c.req.path;
  const method = c.req.method;

  db.apiMetrics.create({
    data: {
      projectId,
      endpoint,
      method,
      statusCode,
      durationMs,
      timestamp: new Date(),
    },
  }).catch(err => console.error('Metrics record error:', err));
}

export function metricsMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;
    record(c, c.res.status || 200, durationMs);
  };
}
