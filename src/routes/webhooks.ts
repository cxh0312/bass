import { Hono } from 'hono';
import crypto from 'crypto';
import { db } from '../db.js';
import { createAuditLog } from '../services/audit.js';
import { retryWebhookDelivery } from '../services/webhook.js';

export const webhookRoutes = new Hono();

webhookRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const auth = c.get('user') as { userId: string } | undefined;

  const { projectId, name, url, events } = body;

  if (!projectId || !name || !url || !events?.length) {
    return c.json({ code: 400, msg: 'Missing required fields' }, 400);
  }

  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await db.webhook.create({
    data: { projectId, name, url, events, secret }
  });

  const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || undefined;
  const userAgent = c.req.header('user-agent');
  await createAuditLog({ userId: auth?.userId || '', action: 'webhook.create', resource: 'Webhook', resourceId: webhook.id, ip, userAgent });

  return c.json({
    success: true,
    data: { ...webhook, secret }
  }, 201);
});

webhookRoutes.get('/', async (c) => {
  const projectId = c.req.query('projectId');

  const webhooks = await db.webhook.findMany({
    where: projectId ? { projectId } : undefined,
    select: { id: true, name: true, url: true, events: true, active: true, createdAt: true }
  });

  return c.json({ success: true, data: webhooks });
});

webhookRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const webhook = await db.webhook.update({
    where: { id },
    data: { name: body.name, url: body.url, events: body.events, active: body.active }
  });

  return c.json({ success: true, data: webhook });
});

webhookRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const auth = c.get('user') as { userId: string } | undefined;

  await db.webhook.delete({ where: { id } });

  await createAuditLog({ userId: auth?.userId || '', action: 'webhook.delete', resource: 'Webhook', resourceId: id });

  return c.json({ success: true, message: 'Webhook deleted' });
});

webhookRoutes.post('/:id/test', async (c) => {
  const id = c.req.param('id');
  const webhook = await db.webhook.findUnique({ where: { id } });

  if (!webhook) {
    return c.json({ code: 404, msg: 'Webhook not found' }, 404);
  }

  const testPayload = {
    type: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test webhook' }
  };

  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(testPayload))
    .digest('hex');

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`
      },
      body: JSON.stringify(testPayload)
    });

    return c.json({ success: true, statusCode: res.status });
  } catch (err: any) {
    return c.json({ success: false, error: err.message });
  }
});

// GET /webhooks/:id/deliveries - 投递记录
webhookRoutes.get('/:id/deliveries', async (c) => {
  const { id } = c.req.param();
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const [deliveries, total] = await Promise.all([
    db.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.webhookDelivery.count({ where: { webhookId: id } }),
  ]);

  return c.json({ success: true, data: deliveries, pagination: { page, limit, total } });
});

// POST /webhooks/deliveries/:id/retry - 重试投递
webhookRoutes.post('/deliveries/:id/retry', async (c) => {
  const { id } = c.req.param();
  try {
    await retryWebhookDelivery(id);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 404);
  }
});
