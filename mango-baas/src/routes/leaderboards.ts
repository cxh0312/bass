import { Hono } from 'hono';
import { db } from '../db.js';
import { adminAuthMiddleware } from '../middleware/auth.js';

export const leaderboardRoutes = new Hono();

// 路由守卫：检查 admin 权限
async function adminOnly(c: Hono['context']) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(token, process.env.JWT_SECRET || 'secret', { algorithms: ['HS256'] }) as any;
    if (payload.role !== 'admin') {
      return c.json({ code: 403, msg: 'Admin only' }, 403);
    }
    c.set('user', payload);
    return null;
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
}

const success = (c: Hono['context'], data: unknown) => c.json({ code: 0, msg: 'success', data });
const error = (c: Hono['context'], code: number, msg: string, status = 400) => c.json({ code, msg }, status);

// POST /admin/leaderboards - 创建排行榜
leaderboardRoutes.post('/leaderboards', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { projectId, name, description, metric, updateStrategy, resetSchedule, enabled } = await c.req.json();

  if (!projectId || !name) {
    return error(c, 400, 'projectId and name required');
  }

  const leaderboard = await db.leaderboard.create({
    data: {
      projectId,
      name,
      description,
      metric: metric || 'higher',
      updateStrategy: updateStrategy || 'realtime',
      resetSchedule,
      enabled: enabled ?? true,
    },
  });

  return success(c, leaderboard);
});

// GET /admin/leaderboards - 排行榜列表
leaderboardRoutes.get('/leaderboards', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const projectId = c.req.query('projectId');
  const where = projectId ? { projectId } : {};

  const leaderboards = await db.leaderboard.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return success(c, leaderboards);
});

// GET /admin/leaderboards/:id - 排行榜详情
leaderboardRoutes.get('/leaderboards/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const leaderboard = await db.leaderboard.findUnique({ where: { id } });

  if (!leaderboard) {
    return error(c, 404, 'Leaderboard not found', 404);
  }

  return success(c, leaderboard);
});

// PUT /admin/leaderboards/:id - 更新排行榜
leaderboardRoutes.put('/leaderboards/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const { name, description, metric, updateStrategy, resetSchedule, enabled } = await c.req.json();

  const leaderboard = await db.leaderboard.update({
    where: { id },
    data: { name, description, metric, updateStrategy, resetSchedule, enabled },
  });

  return success(c, leaderboard);
});

// DELETE /admin/leaderboards/:id - 删除排行榜
leaderboardRoutes.delete('/leaderboards/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();

  // 删除关联的 entries
  await db.leaderboardEntry.deleteMany({ where: { leaderboardId: id } });
  await db.leaderboard.delete({ where: { id } });

  return success(c, { id });
});

// GET /admin/leaderboards/:id/entries - 获取排行榜的所有提交
leaderboardRoutes.get('/leaderboards/:id/entries', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const leaderboard = await db.leaderboard.findUnique({ where: { id } });
  if (!leaderboard) {
    return error(c, 404, 'Leaderboard not found', 404);
  }

  // 根据 metric 决定排序
  const orderBy = leaderboard.metric === 'lower' ? { score: 'asc' as const } : { score: 'desc' as const };

  const [entries, total] = await Promise.all([
    db.leaderboardEntry.findMany({
      where: { leaderboardId: id },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.leaderboardEntry.count({ where: { leaderboardId: id } }),
  ]);

  return c.json({
    code: 0,
    msg: 'success',
    data: entries,
    pagination: { page, limit, total },
  });
});

// DELETE /admin/leaderboards/:id/entries/:entryId - 删除单个条目
leaderboardRoutes.delete('/leaderboards/:id/entries/:entryId', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { entryId } = c.req.param();
  await db.leaderboardEntry.delete({ where: { id: entryId } });

  return success(c, { id: entryId });
});
