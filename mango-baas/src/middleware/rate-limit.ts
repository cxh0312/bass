import { Context, Next } from 'hono';
import { db } from '../db.js';

// In-memory rate limit tracking
const requestCounts = new Map<string, { count: number; windowStart: number }>();

interface RateLimitMatch {
  limit: number;
  windowSec: number;
  ruleName: string;
}

async function matchRateLimitRule(c: Context): Promise<RateLimitMatch | null> {
  // Get identifier from context (set by auth middleware)
  const authType = c.get('authType');
  let identifier = 'global';
  let key: string | undefined;

  if (authType === 'apiKey') {
    const project = c.get('project');
    if (project) {
      identifier = 'project';
      key = project.id;
    }
  } else {
    const user = c.get('user');
    if (user?.userId) {
      identifier = 'user';
      key = user.userId;
    }
  }

  // Query matching rules: global first, then specific
  const rules = await db.rateLimitRule.findMany({
    where: { enabled: true },
    orderBy: { createdAt: 'asc' },
  });

  // Find matching rule (global or specific)
  let matchedRule = rules.find(r => r.identifier === 'global');

  if (!matchedRule && key) {
    matchedRule = rules.find(r => r.identifier === identifier && r.key === key);
  }

  if (!matchedRule && identifier !== 'global') {
    matchedRule = rules.find(r => r.identifier === identifier && !r.key);
  }

  if (!matchedRule) {
    return null;
  }

  return {
    limit: matchedRule.limit,
    windowSec: matchedRule.windowSec,
    ruleName: matchedRule.name,
  };
}

function checkRateLimit(identifier: string, limit: number, windowSec: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000)) * (windowSec * 1000);
  const key = `${identifier}:${windowStart}`;

  let record = requestCounts.get(key);
  if (!record || record.windowStart !== windowStart) {
    record = { count: 0, windowStart };
    requestCounts.set(key, record);
  }

  record.count++;
  const remaining = Math.max(0, limit - record.count);
  const resetIn = windowSec - Math.floor((now - windowStart) / 1000);

  return {
    allowed: record.count <= limit,
    remaining,
    resetIn: Math.max(0, resetIn),
  };
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  // Skip rate limiting for admin routes
  if (c.req.path.startsWith('/admin')) {
    return next();
  }

  const match = await matchRateLimitRule(c);
  if (!match) {
    return next();
  }

  // Build identifier from auth context
  const authType = c.get('authType');
  let identifier = 'global';
  if (authType === 'apiKey') {
    const project = c.get('project');
    identifier = project ? `project:${project.id}` : 'global';
  } else {
    const user = c.get('user');
    identifier = user?.userId ? `user:${user.userId}` : 'global';
  }

  const result = checkRateLimit(identifier, match.limit, match.windowSec);

  // Set rate limit headers
  c.res.headers.set('X-RateLimit-Limit', match.limit.toString());
  c.res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  c.res.headers.set('X-RateLimit-Reset', result.resetIn.toString());

  if (!result.allowed) {
    console.log(`[RateLimit] Rate limit exceeded for ${identifier} (rule: ${match.ruleName})`);
    c.res.headers.set('Retry-After', result.resetIn.toString());
    return c.json({ code: 429, msg: 'Rate limit exceeded', retryAfter: result.resetIn }, 429);
  }

  return next();
}
