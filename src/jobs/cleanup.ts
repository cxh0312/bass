import { db } from '../db.js';
import { cleanupRateLimits } from '../services/rate-limit.js';

async function cleanup() {
  console.log('Running cleanup jobs...');

  // 清理过期的 RefreshToken
  await db.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });

  // 清理过期的 PasswordResetToken
  await db.passwordResetToken.deleteMany({
    where: { OR: [
      { used: true },
      { expiresAt: { lt: new Date() } }
    ]}
  });

  // 清理限流记录
  await cleanupRateLimits();

  // 重试失败的 Webhook（最多 3 次）
  const failedDeliveries = await db.webhookDelivery.findMany({
    where: {
      success: false,
      attempt: { lt: 3 },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lt: new Date() } }
      ]
    }
  });

  for (const delivery of failedDeliveries) {
    const webhook = await db.webhook.findUnique({ where: { id: delivery.webhookId } });
    if (webhook) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempt: { increment: 1 },
          nextRetryAt: new Date(Date.now() + getRetryDelay(delivery.attempt + 1))
        }
      });
      // trigger retry...
    }
  }

  console.log('Cleanup complete');
}

function getRetryDelay(attempt: number): number {
  const delays = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000]; // 1min, 5min, 30min
  return delays[attempt - 1] || 30 * 60 * 1000;
}

// 运行一次
cleanup().catch(console.error);