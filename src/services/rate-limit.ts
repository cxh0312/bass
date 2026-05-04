import { db } from '../db.js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

const WINDOW_MS = 60 * 1000; // 1 分钟

export async function checkRateLimit(
  identifier: string,
  limit: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const existing = await db.rateLimitRecord.findUnique({
    where: {
      identifier_windowStart: { identifier, windowStart }
    }
  });

  if (!existing) {
    await db.rateLimitRecord.create({
      data: { identifier, windowStart, count: 1 }
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil((existing.windowStart.getTime() + WINDOW_MS) / 1000)
    };
  }

  await db.rateLimitRecord.update({
    where: { id: existing.id },
    data: { count: { increment: 1 } }
  });

  return { allowed: true, remaining: limit - existing.count - 1 };
}

// 清理过期记录
export async function cleanupRateLimits() {
  const cutoff = new Date(Date.now() - WINDOW_MS * 2);
  await db.rateLimitRecord.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });
}