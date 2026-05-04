import { Hono } from 'hono';
import { createSSEStream, removeSSEStream } from '../services/realtime.js';

export const realtimeRoutes = new Hono();

realtimeRoutes.get('/events/:projectId', async (c) => {
  const { projectId } = c.req.param();
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  if (!apiKey) return c.json({ code: 401, msg: 'API Key required' }, 401);

  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      createSSEStream(projectId, controller);
      controller.enqueue(new TextEncoder().encode('data: {"event":"connected"}\n\n'));
    },
    cancel() {
      removeSSEStream(projectId, controller);
    },
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  return c.body(stream as any);
});
