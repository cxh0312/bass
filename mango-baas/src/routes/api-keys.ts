import { Hono } from 'hono';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { createApiKeySchema } from '../schemas.js';
import { createAuditLog } from '../services/audit.js';

export const apiKeyRoutes = new Hono();

const KEY_PREFIX = 'mba_sk_';

// 生成 API Key
function generateApiKey() {
  const random = crypto.randomBytes(16).toString('hex');
  return `${KEY_PREFIX}${random}`;
}

// 创建 API Key
apiKeyRoutes.post('/', async (c) => {
  const auth = c.get('user') as { userId: string };
  const body = await c.req.json();
  const result = createApiKeySchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { name, projectId } = result.data;
  const rawKey = generateApiKey();
  const hashedKey = await bcrypt.hash(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await db.apiKey.create({
    data: {
      name,
      key: hashedKey,
      keyPrefix,
      userId: auth.userId,
      projectId
    }
  });

  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent');
  await createAuditLog({
    userId: auth.userId,
    action: 'apikey.create',
    resource: 'ApiKey',
    resourceId: apiKey.id,
    ip,
    userAgent
  });

  return c.json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt
    }
  }, 201);
});

// 列出 API Key
apiKeyRoutes.get('/', async (c) => {
  const auth = c.get('user') as { userId: string };

  const apiKeys = await db.apiKey.findMany({
    where: { userId: auth.userId },
    select: { id: true, name: true, keyPrefix: true, lastUsed: true, createdAt: true }
  });

  return c.json({ success: true, data: apiKeys });
});

// 删除 API Key
apiKeyRoutes.delete('/:id', async (c) => {
  const auth = c.get('user') as { userId: string };
  const id = c.req.param('id');

  const apiKey = await db.apiKey.findUnique({ where: { id } });
  if (!apiKey || apiKey.userId !== auth.userId) {
    return c.json({ code: 404, msg: 'API Key not found' }, 404);
  }

  await db.apiKey.delete({ where: { id } });

  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent');
  await createAuditLog({
    userId: auth.userId,
    action: 'apikey.delete',
    resource: 'ApiKey',
    resourceId: id,
    ip,
    userAgent
  });

  return c.json({ success: true, message: 'API Key deleted' });
});