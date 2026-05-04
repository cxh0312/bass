import { Hono } from 'hono';
import { db } from '../db.js';

export const rateLimitRoutes = new Hono();

// 速率限制规则 CRUD

// GET /admin/rate-limits - 列表
rateLimitRoutes.get('/', async (c) => {
  const rules = await db.rateLimitRule.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ code: 0, msg: 'success', data: rules });
});

// POST /admin/rate-limits - 创建规则
rateLimitRoutes.post('/', async (c) => {
  const { name, identifier, key, limit, windowSec, projectId, enabled } = await c.req.json();

  if (!name || !identifier || !limit || !windowSec) {
    return c.json({ code: 400, msg: 'name, identifier, limit, windowSec are required' }, 400);
  }

  if (!['global', 'project', 'apikey', 'user'].includes(identifier)) {
    return c.json({ code: 400, msg: 'identifier must be one of: global, project, apikey, user' }, 400);
  }

  const rule = await db.rateLimitRule.create({
    data: {
      name,
      identifier,
      key: key || null,
      limit,
      windowSec,
      projectId: projectId || null,
      enabled: enabled ?? true,
    },
  });

  return c.json({ code: 0, msg: 'success', data: rule });
});

// PUT /admin/rate-limits/:id - 更新规则
rateLimitRoutes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const { name, identifier, key, limit, windowSec, projectId, enabled } = await c.req.json();

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (identifier !== undefined) {
    if (!['global', 'project', 'apikey', 'user'].includes(identifier)) {
      return c.json({ code: 400, msg: 'identifier must be one of: global, project, apikey, user' }, 400);
    }
    data.identifier = identifier;
  }
  if (key !== undefined) data.key = key;
  if (limit !== undefined) data.limit = limit;
  if (windowSec !== undefined) data.windowSec = windowSec;
  if (projectId !== undefined) data.projectId = projectId;
  if (enabled !== undefined) data.enabled = enabled;

  const rule = await db.rateLimitRule.update({
    where: { id },
    data,
  });

  return c.json({ code: 0, msg: 'success', data: rule });
});

// DELETE /admin/rate-limits/:id - 删除规则
rateLimitRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  await db.rateLimitRule.delete({ where: { id } });
  return c.json({ code: 0, msg: 'success' });
});