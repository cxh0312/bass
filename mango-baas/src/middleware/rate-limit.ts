import { Context, Next } from 'hono';
import { checkRateLimit } from '../services/rate-limit.js';

const IP_LIMIT = 100;
const USER_LIMIT = 1000;

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] || c.var.ip || 'unknown';
  const user = c.get('user') as { userId: string } | undefined;
  const authType = c.get('authType');

  let identifier = ip;
  let limit = IP_LIMIT;

  if (authType === 'jwt' && user) {
    identifier = `user:${user.userId}`;
    limit = USER_LIMIT;
  }

  const result = await checkRateLimit(identifier, limit);

  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    const retryAfter = result.resetAt ? result.resetAt - Math.floor(Date.now() / 1000) : 60;
    c.header('Retry-After', String(retryAfter));
    return c.json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter
    }, 429);
  }

  return next();
}