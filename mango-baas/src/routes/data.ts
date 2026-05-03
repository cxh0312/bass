import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db.js';
import { querySchema, createDataSchema, updateDataSchema, buildDynamicSchema } from '../schemas.js';
import { authMiddleware, verifyAuth } from '../middleware/auth.js';
import { projectAccessMiddleware, checkPermission } from '../middleware/rbac.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import { triggerWebhooks } from '../services/webhook.js';

export const dataRoutes = new Hono();

// 应用认证和项目访问中间件
dataRoutes.use('/*', authMiddleware);
dataRoutes.use('/*', rateLimitMiddleware);
dataRoutes.use('/*', projectAccessMiddleware);

// 通用响应
const success = (c: Hono['context'], data: unknown, extra?: { total?: number; page?: number; limit?: number }) =>
  c.json({ code: 0, msg: 'success', data, ...extra });

const error = (c: Hono['context'], code: number, msg: string, status = 400) =>
  c.json({ code, msg }, status);

// 解析 filter JSON
function parseFilter(filterStr?: string): Record<string, unknown> {
  if (!filterStr) return {};
  try {
    return JSON.parse(filterStr);
  } catch {
    return {};
  }
}

// GET /api/:projectId/:collection - 查询列表
dataRoutes.get('/:projectId/:collection', zValidator('query', querySchema), async (c) => {
  const { projectId, collection } = c.req.param();
  const { page, limit, filter: filterStr, sort, fields } = c.req.valid('query');
  const member = c.get('member');

  // 获取 Collection
  const collectionDoc = await db.collection.findFirst({
    where: { projectId, name: collection },
  });

  if (!collectionDoc) {
    return error(c, 404, 'Collection not found', 404);
  }

  // 检查读权限
  if (!checkPermission(member, collectionDoc, 'read')) {
    return error(c, 403, 'Permission denied', 403);
  }

  // 构建查询
  const where: Record<string, unknown> = {
    collectionId: collectionDoc.id,
    projectId,
    ...parseFilter(filterStr),
  };

  const [data, total] = await Promise.all([
    db.data.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sort
        ? sort.startsWith('-')
          ? { [sort.slice(1)]: 'desc' as const }
          : { [sort]: 'asc' as const }
        : { createdAt: 'desc' as const },
    }),
    db.data.count({ where }),
  ]);

  return success(c, data, { total, page, limit });
});

// POST /api/:projectId/:collection - 创建数据
dataRoutes.post('/:projectId/:collection', async (c) => {
  const { projectId, collection } = c.req.param();
  const body = await c.req.json();
  const member = c.get('member');

  // _id 禁止写入
  if (body._id) {
    return error(c, 400, 'Field _id is read-only');
  }

  const collectionDoc = await db.collection.findFirst({
    where: { projectId, name: collection },
  });

  if (!collectionDoc) {
    return error(c, 404, 'Collection not found', 404);
  }

  if (!checkPermission(member, collectionDoc, 'write')) {
    return error(c, 403, 'Permission denied', 403);
  }

  // 严格模式校验
  if (collectionDoc.strict && collectionDoc.schema) {
    try {
      const zodSchema = buildDynamicSchema(collectionDoc.schema as Record<string, unknown>);
      const result = zodSchema.safeParse(body);
      if (!result.success) {
        return error(c, 400, `Validation failed: ${result.error.issues[0].path.join('.')}`);
      }
    } catch {
      return error(c, 400, 'Invalid schema definition');
    }
  }

  const data = await db.data.create({
    data: {
      collectionId: collectionDoc.id,
      projectId,
      payload: body,
    },
  });

  await triggerWebhooks(projectId, 'create', { collectionId: collectionDoc.id, recordId: data.id, payload: body });

  return success(c, { id: data.id, ...body }, { total: 1, page: 1, limit: 1 });
});

// GET /api/:projectId/:collection/:id - 获取单条
dataRoutes.get('/:projectId/:collection/:id', async (c) => {
  const { projectId, collection, id } = c.req.param();
  const member = c.get('member');

  const collectionDoc = await db.collection.findFirst({
    where: { projectId, name: collection },
  });

  if (!collectionDoc) {
    return error(c, 404, 'Collection not found', 404);
  }

  if (!checkPermission(member, collectionDoc, 'read')) {
    return error(c, 403, 'Permission denied', 403);
  }

  const data = await db.data.findFirst({
    where: { id, collectionId: collectionDoc.id, projectId },
  });

  if (!data) {
    return error(c, 404, 'Data not found', 404);
  }

  return success(c, { id: data.id, ...(data.payload as object) });
});

// PUT /api/:projectId/:collection/:id - 更新数据
dataRoutes.put('/:projectId/:collection/:id', async (c) => {
  const { projectId, collection, id } = c.req.param();
  const body = await c.req.json();
  const member = c.get('member');

  if (body._id) {
    return error(c, 400, 'Field _id is read-only');
  }

  const collectionDoc = await db.collection.findFirst({
    where: { projectId, name: collection },
  });

  if (!collectionDoc) {
    return error(c, 404, 'Collection not found', 404);
  }

  if (!checkPermission(member, collectionDoc, 'write')) {
    return error(c, 403, 'Permission denied', 403);
  }

  const existing = await db.data.findFirst({
    where: { id, collectionId: collectionDoc.id, projectId },
  });

  if (!existing) {
    return error(c, 404, 'Data not found', 404);
  }

  const data = await db.data.update({
    where: { id },
    data: { payload: body },
  });

  await triggerWebhooks(projectId, 'update', { collectionId: collectionDoc.id, recordId: id, payload: body });

  return success(c, { id: data.id, ...body });
});

// DELETE /api/:projectId/:collection/:id - 删除数据
dataRoutes.delete('/:projectId/:collection/:id', async (c) => {
  const { projectId, collection, id } = c.req.param();
  const member = c.get('member');

  const collectionDoc = await db.collection.findFirst({
    where: { projectId, name: collection },
  });

  if (!collectionDoc) {
    return error(c, 404, 'Collection not found', 404);
  }

  if (!checkPermission(member, collectionDoc, 'delete')) {
    return error(c, 403, 'Permission denied', 403);
  }

  const existing = await db.data.findFirst({
    where: { id, collectionId: collectionDoc.id, projectId },
  });

  if (!existing) {
    return error(c, 404, 'Data not found', 404);
  }

  await db.data.delete({ where: { id } });

  await triggerWebhooks(projectId, 'delete', { collectionId: collectionDoc.id, recordId: id, payload: {} });

  return success(c, { id });
});