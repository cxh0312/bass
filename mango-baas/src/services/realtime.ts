import { db } from '../db.js';

const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function initRealtime() {
  // 监听数据变更事件（在 data.ts 中调用 broadcast）
}

export function broadcast(projectId: string, event: string, data: any) {
  const projectClients = clients.get(projectId);
  if (!projectClients) return;

  const message = `data: ${JSON.stringify({ event, data })}\n\n`;
  const encoder = new TextEncoder();

  for (const controller of projectClients) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      projectClients.delete(controller);
    }
  }
}

export function createSSEStream(projectId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(projectId)) {
    clients.set(projectId, new Set());
  }
  clients.get(projectId)!.add(controller);
}

export function removeSSEStream(projectId: string, controller: ReadableStreamDefaultController) {
  clients.get(projectId)?.delete(controller);
}
