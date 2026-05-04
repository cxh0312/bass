import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const alertRoutes = new Hono();

async function adminOnly(c: Hono['context']) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret', { algorithms: ['HS256'] }) as any;
    if (payload.role !== 'admin') {
      return c.json({ code: 403, msg: 'Admin only' }, 403);
    }
    c.set('user', payload);
    return null;
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
}

// ---- Alert Rules CRUD ----

// GET /admin/alerts - list rules
alertRoutes.get('/', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const rules = await db.alertRule.findMany({ orderBy: { createdAt: 'desc' } });
  return c.json({ code: 0, msg: 'success', data: rules });
});

// POST /admin/alerts - create rule
alertRoutes.post('/', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const body = await c.req.json();
  const { name, metric, threshold, condition, windowMin, notifyWebhook, notifyEmail, projectId } = body;

  if (!name || !metric || threshold == null) {
    return c.json({ code: 400, msg: 'name, metric, threshold required' }, 400);
  }

  const validMetrics = ['error_rate', 'response_time', 'quota'];
  if (!validMetrics.includes(metric)) {
    return c.json({ code: 400, msg: `metric must be one of: ${validMetrics.join(', ')}` }, 400);
  }

  const rule = await db.alertRule.create({
    data: {
      name,
      metric,
      threshold: parseFloat(threshold),
      condition: condition || 'gt',
      windowMin: windowMin || 5,
      notifyWebhook: notifyWebhook || null,
      notifyEmail: notifyEmail || null,
      projectId: projectId || null,
    },
  });

  return c.json({ code: 0, msg: 'success', data: rule });
});

// PUT /admin/alerts/:id - update rule
alertRoutes.put('/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, metric, threshold, condition, windowMin, notifyWebhook, notifyEmail, projectId, enabled } = body;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (metric !== undefined) data.metric = metric;
  if (threshold !== undefined) data.threshold = parseFloat(threshold);
  if (condition !== undefined) data.condition = condition;
  if (windowMin !== undefined) data.windowMin = windowMin;
  if (notifyWebhook !== undefined) data.notifyWebhook = notifyWebhook;
  if (notifyEmail !== undefined) data.notifyEmail = notifyEmail;
  if (projectId !== undefined) data.projectId = projectId;
  if (enabled !== undefined) data.enabled = enabled;

  const rule = await db.alertRule.update({ where: { id }, data });
  return c.json({ code: 0, msg: 'success', data: rule });
});

// DELETE /admin/alerts/:id - delete rule
alertRoutes.delete('/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  await db.alertRule.delete({ where: { id } });
  return c.json({ code: 0, msg: 'success' });
});

// GET /admin/alerts/events - alert event history
alertRoutes.get('/events', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const [events, total] = await Promise.all([
    db.alertEvent.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.alertEvent.count(),
  ]);

  return c.json({ code: 0, msg: 'success', data: events, pagination: { page, limit, total } });
});

// POST /admin/alerts/check - trigger alert check
alertRoutes.post('/check', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { checkAlerts } = await import('../services/alerting.js');
  const results = await checkAlerts();
  return c.json({ code: 0, msg: 'success', data: results });
});

// ---- Metrics Query APIs ----

// GET /admin/alerts/metrics/overview - dashboard metrics
alertRoutes.get('/metrics/overview', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const total = await db.apiMetrics.count();
  const weekMetrics = await db.apiMetrics.findMany({
    where: { timestamp: { gte: weekStart } },
    select: { statusCode: true, durationMs: true },
  });

  const errorCount = weekMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = weekMetrics.length > 0 ? (errorCount / weekMetrics.length) * 100 : 0;
  const avgDuration = weekMetrics.length > 0
    ? weekMetrics.reduce((s, m) => s + m.durationMs, 0) / weekMetrics.length
    : 0;

  const sorted = [...weekMetrics].sort((a, b) => a.durationMs - b.durationMs);
  const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)]?.durationMs || 0 : 0;
  const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)]?.durationMs || 0 : 0;

  // 7-day trend
  const dailyTrend: { date: string; count: number; avgDuration: number; errorRate: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayMetrics = await db.apiMetrics.findMany({
      where: { timestamp: { gte: dayStart, lt: dayEnd } },
      select: { statusCode: true, durationMs: true },
    });

    const dayErrors = dayMetrics.filter(m => m.statusCode >= 400).length;
    dailyTrend.push({
      date: dayStart.toISOString().split('T')[0],
      count: dayMetrics.length,
      avgDuration: dayMetrics.length > 0
        ? dayMetrics.reduce((s, m) => s + m.durationMs, 0) / dayMetrics.length
        : 0,
      errorRate: dayMetrics.length > 0 ? (dayErrors / dayMetrics.length) * 100 : 0,
    });
  }

  return c.json({
    code: 0,
    msg: 'success',
    data: {
      totalCalls: total,
      weekCalls: weekMetrics.length,
      errorRate: Math.round(errorRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      p95: Math.round(p95),
      p99: Math.round(p99),
      dailyTrend,
    },
  });
});

// GET /admin/alerts/metrics/slow-queries - slow queries (>1s)
alertRoutes.get('/metrics/slow-queries', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  // Get the most recent metrics with duration > 1000ms
  const allSlow = await db.apiMetrics.findMany({
    where: { durationMs: { gte: 1000 } },  // MongoDB syntax
    orderBy: { timestamp: 'desc' },
  });

  const total = allSlow.length;
  const data = allSlow.slice((page - 1) * limit, page * limit);

  return c.json({ code: 0, msg: 'success', data, pagination: { page, limit, total } });
});

// GET /admin/alerts/metrics/project/:id/usage - project usage
alertRoutes.get('/metrics/project/:id/usage', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const days = parseInt(c.req.query('days') || '30');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(todayStart);
  startDate.setDate(startDate.getDate() - days);

  const metrics = await db.apiMetrics.findMany({
    where: { projectId: id, timestamp: { gte: startDate } },
    select: { endpoint: true, method: true, statusCode: true, durationMs: true, timestamp: true },
    orderBy: { timestamp: 'desc' },
  });

  // Daily counts
  const dailyCounts: Record<string, number> = {};
  for (let i = days; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    dailyCounts[d.toISOString().split('T')[0]] = 0;
  }
  for (const m of metrics) {
    const day = m.timestamp.toISOString().split('T')[0];
    if (dailyCounts[day] !== undefined) dailyCounts[day]++;
  }

  // Top endpoints
  const endpointCounts: Record<string, number> = {};
  for (const m of metrics) {
    const key = `${m.method} ${m.endpoint}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  }
  const topEndpoints = Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  // Error count
  const errors = metrics.filter(m => m.statusCode >= 400).length;
  const total = metrics.length;
  const errorRate = total > 0 ? (errors / total) * 100 : 0;

  return c.json({
    code: 0,
    msg: 'success',
    data: {
      totalCalls: total,
      errorCount: errors,
      errorRate: Math.round(errorRate * 100) / 100,
      dailyCounts,
      topEndpoints,
    },
  });
});
