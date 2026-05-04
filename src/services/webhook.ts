import { db } from '../db.js';
import crypto from 'crypto';

export async function triggerWebhooks(
  projectId: string,
  event: 'create' | 'update' | 'delete',
  data: { collectionId: string; recordId: string; payload: any }
) {
  const webhooks = await db.webhook.findMany({
    where: { projectId, active: true, events: { has: event } }
  });

  for (const webhook of webhooks) {
    const delivery = await db.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: { type: `data.${event}`, timestamp: new Date().toISOString(), data }
      }
    });

    // 异步投递
    deliverWebhook(webhook, delivery).catch(console.error);
  }
}

async function deliverWebhook(webhook: any, delivery: any) {
  const payload = delivery.payload as any;
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-ID': delivery.id
      },
      body: JSON.stringify(payload)
    });

    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        success: res.ok,
        statusCode: res.status,
        response: await res.text().then(t => t.slice(0, 1000))
      }
    });
  } catch (err: any) {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { success: false, response: err.message }
    });
  }
}

export async function retryWebhookDelivery(deliveryId: string) {
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId }
  });

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  const webhook = await db.webhook.findUnique({
    where: { id: delivery.webhookId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  await deliverWebhook(webhook, delivery);
}
