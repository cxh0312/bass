import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { db } from '../db.js';

export const adminRoutes = new Hono();

// 仅限全局 admin
async function adminOnly(c: Hono['context']) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(authHeader.slice(7), process.env.JWT_SECRET || 'secret');
    if (payload.role !== 'admin') {
      return c.json({ code: 403, msg: 'Admin only' }, 403);
    }
    return null;
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
}

// GET /admin/users - 用户列表
adminRoutes.get('/users', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ code: 0, msg: 'success', data: users });
});

// PUT /admin/users/:id/role - 修改用户角色
adminRoutes.put('/users/:id/role', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const { role } = await c.req.json();

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return c.json({ code: 400, msg: 'Invalid role' }, 400);
  }

  const user = await db.user.update({
    where: { id },
    data: { role: role as 'admin' | 'editor' | 'viewer' },
    select: { id: true, email: true, role: true },
  });

  return c.json({ code: 0, msg: 'success', data: user });
});

// GET /admin/stats - 系统统计
adminRoutes.get('/stats', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const [userCount, projectCount, dataCount] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.data.count(),
  ]);

  return c.json({
    code: 0,
    msg: 'success',
    data: { userCount, projectCount, dataCount },
  });
});

// 审计日志列表 API
adminRoutes.get('/audit-logs', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const userId = c.req.query('userId');
  const action = c.req.query('action');
  const resource = c.req.query('resource');

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    db.auditLog.count({ where })
  ]);

  return c.json({
    success: true,
    data: logs,
    pagination: { page, limit, total }
  });
});