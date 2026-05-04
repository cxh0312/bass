import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { authEnhancedRoutes } from './routes/auth-enhanced.js';
import { dataRoutes } from './routes/data.js';
import { adminRoutes } from './routes/admin.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { webhookRoutes } from './routes/webhooks.js';
import { rateLimitRoutes } from './routes/rate-limits.js';
import { leaderboardRoutes } from './routes/leaderboards.js';
import { alertRoutes } from './routes/alerts.js';
import { realtimeRoutes } from './routes/realtime.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { db } from './db.js';

const app = new Hono();

// 中间件
app.use('*', cors());
app.use('*', logger());
app.use('*', metricsMiddleware());

// 健康检查
app.get('/api/health', (c) => c.json({ code: 0, msg: 'ok' }));

// 路由
app.route('/auth', authRoutes);
app.route('/auth', authEnhancedRoutes);
app.route('/api', dataRoutes);
app.route('/admin', adminRoutes);
app.route('/api-keys', apiKeyRoutes);
app.route('/webhooks', webhookRoutes);
app.route('/admin/rate-limits', rateLimitRoutes);
app.route('/admin', leaderboardRoutes);
app.route('/admin/alerts', alertRoutes);
app.route('/realtime', realtimeRoutes);

// 错误处理
app.onError((err, c) => {
  console.error(err);
  return c.json({ code: 500, msg: 'Internal server error' }, 500);
});

// 启动
const port = parseInt(process.env.PORT || '3000');

const start = async () => {
  await db.$connect();
  console.log(`Server starting on port ${port}`);
  Bun.serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  });
  console.log(`Server is running on http://localhost:${port}`);
};

start();