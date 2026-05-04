import { Hono } from 'hono';
import { sign as jwtSign } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { adminAuthMiddleware } from '../middleware/auth.js';

export const adminRoutes = new Hono();

// 路由守卫：检查 admin 权限
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
    return null; // 通过验证
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
}

// POST /admin/auth/login - 登录
adminRoutes.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ code: 400, msg: 'Email and password required' }, 400);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ code: 401, msg: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return c.json({ code: 401, msg: 'Invalid credentials' }, 401);
  }

  // 生成 JWT
  const token = await jwtSign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  return c.json({ code: 0, msg: 'success', data: { token } });
});

// GET /admin/auth/me - 获取当前用户
adminRoutes.get('/auth/me', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const user = c.get('user');
  return c.json({ code: 0, msg: 'success', data: user });
});

// GET /admin/users - 用户列表
adminRoutes.get('/users', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const [users, total] = await Promise.all([
    db.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count(),
  ]);

  return c.json({ code: 0, msg: 'success', data: users, pagination: { page, limit, total } });
});

// GET /admin/users/:id - 用户详情
adminRoutes.get('/users/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (!user) {
    return c.json({ code: 404, msg: 'User not found' }, 404);
  }

  return c.json({ code: 0, msg: 'success', data: user });
});

// POST /admin/users - 创建用户
adminRoutes.post('/users', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { email, password, name, role } = await c.req.json();

  if (!email || !password) {
    return c.json({ code: 400, msg: 'Email and password required' }, 400);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ code: 400, msg: 'Email already exists' }, 400);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: role || 'viewer',
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return c.json({ code: 0, msg: 'success', data: user });
});

// PUT /admin/users/:id - 更新用户
adminRoutes.put('/users/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const { name, role } = await c.req.json();

  const user = await db.user.update({
    where: { id },
    data: { name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return c.json({ code: 0, msg: 'success', data: user });
});

// DELETE /admin/users/:id - 删除用户
adminRoutes.delete('/users/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  await db.user.delete({ where: { id } });

  return c.json({ code: 0, msg: 'success' });
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

// GET /admin/projects - 项目列表
adminRoutes.get('/projects', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const projects = await db.project.findMany({
    select: { id: true, name: true, description: true, ownerId: true, apiKey: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ code: 0, msg: 'success', data: projects });
});

// GET /admin/projects/:id - 项目详情
adminRoutes.get('/projects/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const project = await db.project.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!project) {
    return c.json({ code: 404, msg: 'Project not found' }, 404);
  }

  return c.json({ code: 0, msg: 'success', data: project });
});

// POST /admin/projects - 创建项目
adminRoutes.post('/projects', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ code: 400, msg: 'Name required' }, 400);
  }

  // 生成随机 API Key
  const apiKey = 'ak_' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);

  const project = await db.project.create({
    data: {
      name,
      description,
      ownerId: (c.get('user') as any).userId || 'system',
      apiKey,
    },
    select: { id: true, name: true, description: true, ownerId: true, apiKey: true, createdAt: true },
  });

  return c.json({ code: 0, msg: 'success', data: project });
});

// PUT /admin/projects/:id - 更新项目
adminRoutes.put('/projects/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const { name, description } = await c.req.json();

  const project = await db.project.update({
    where: { id },
    data: { name, description },
    select: { id: true, name: true, description: true, ownerId: true, apiKey: true, createdAt: true },
  });

  return c.json({ code: 0, msg: 'success', data: project });
});

// DELETE /admin/projects/:id - 删除项目
adminRoutes.delete('/projects/:id', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  await db.project.delete({ where: { id } });

  return c.json({ code: 0, msg: 'success' });
});

// GET /admin/collections - 集合列表
adminRoutes.get('/collections', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const collections = await db.collection.findMany({
    select: { id: true, projectId: true, name: true, schema: true, strict: true, permissions: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ code: 0, msg: 'success', data: collections });
});

// GET /admin/projects/:projectId/collections - 项目的集合列表
adminRoutes.get('/projects/:projectId/collections', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { projectId } = c.req.param();
  const collections = await db.collection.findMany({
    where: { projectId },
    select: { id: true, projectId: true, name: true, schema: true, strict: true, permissions: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ code: 0, msg: 'success', data: collections });
});

// GET /admin/collections/:id/data - 数据列表
adminRoutes.get('/collections/:id/data', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const [data, total] = await Promise.all([
    db.data.findMany({
      where: { collectionId: id },
      select: { id: true, collectionId: true, projectId: true, payload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.data.count({ where: { collectionId: id } }),
  ]);

  return c.json({ code: 0, msg: 'success', data, pagination: { page, limit, total } });
});

// GET /admin/stats - 系统统计
adminRoutes.get('/stats', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const [
    userCount,
    projectCount,
    totalDataCount,
    todayDataCount,
    weekDataCount,
    monthDataCount,
    recentApiKeys,
    recentWebhooks,
    recentAuditLogs,
  ] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.data.count(),
    db.data.count({ where: { createdAt: { gte: todayStart } } }),
    db.data.count({ where: { createdAt: { gte: weekStart } } }),
    db.data.count({ where: { createdAt: { gte: monthStart } } }),
    db.apiKey.findMany({
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.webhook.findMany({
      select: { id: true, name: true, url: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // 项目排行（按数据量）
  const projectStats = await db.project.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { collections: true, data: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 每日趋势（最近7天）
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await db.data.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    });
    dailyTrend.push({
      date: dayStart.toISOString().split('T')[0],
      count,
    });
  }

  return c.json({
    code: 0,
    msg: 'success',
    data: {
      userCount,
      projectCount,
      totalDataCount,
      todayDataCount,
      weekDataCount,
      monthDataCount,
      recentApiKeys,
      recentWebhooks,
      recentAuditLogs,
      projectStats,
      dailyTrend,
    },
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
    code: 0,
    msg: 'success',
    data: logs,
    pagination: { page, limit, total }
  });
});

// GET /admin/projects/:id/members
adminRoutes.get('/projects/:id/members', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;
  const { id } = c.req.param();
  const members = await db.projectMember.findMany({
    where: { projectId: id },
    select: { id: true, userId: true, role: true, user: { select: { email: true, name: true } } },
  });
  return c.json({ code: 0, msg: 'success', data: members });
});

// POST /admin/projects/:id/members
adminRoutes.post('/projects/:id/members', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;
  const { id } = c.req.param();
  const { userId, role } = await c.req.json();
  if (!userId) return c.json({ code: 400, msg: 'userId required' }, 400);
  const member = await db.projectMember.create({
    data: { projectId: id, userId, role: role || 'editor' },
    select: { id: true, userId: true, role: true, user: { select: { email: true, name: true } } },
  });
  return c.json({ code: 0, msg: 'success', data: member }, 201);
});

// DELETE /admin/projects/:id/members/:memberId
adminRoutes.delete('/projects/:id/members/:memberId', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;
  const { memberId } = c.req.param();
  await db.projectMember.delete({ where: { id: memberId } });
  return c.json({ code: 0, msg: 'success' });
});


// GET /admin/projects/:id/members - 项目成员列表
adminRoutes.get('/projects/:id/members', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const members = await db.projectMember.findMany({
    where: { projectId: id },
    select: { id: true, userId: true, role: true, user: { select: { email: true, name: true } } },
  });

  return c.json({ code: 0, msg: 'success', data: members });
});

// POST /admin/projects/:id/members - 添加成员
adminRoutes.post('/projects/:id/members', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { id } = c.req.param();
  const { userId, role } = await c.req.json();

  if (!userId) return c.json({ code: 400, msg: 'userId required' }, 400);

  const member = await db.projectMember.create({
    data: { projectId: id, userId, role: role || 'editor' },
    select: { id: true, userId: true, role: true, user: { select: { email: true, name: true } } },
  });

  return c.json({ code: 0, msg: 'success', data: member }, 201);
});

// DELETE /admin/projects/:id/members/:memberId - 移除成员
adminRoutes.delete('/projects/:id/members/:memberId', async (c) => {
  const forbidden = await adminOnly(c);
  if (forbidden) return forbidden;

  const { memberId } = c.req.param();
  await db.projectMember.delete({ where: { id: memberId } });

  return c.json({ code: 0, msg: 'success' });
});