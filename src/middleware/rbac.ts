import { Context, Next } from 'hono';
import { db } from '../db.js';

type AuthPayload = {
  userId?: string;
  role?: 'admin' | 'editor' | 'viewer';
};

export async function projectAccessMiddleware(c: Context, next: Next) {
  const authType = c.get('authType');

  // API Key 认证已在 authMiddleware 验证
  if (authType === 'apiKey') {
    return next();
  }

  const user = c.get('user') as AuthPayload | undefined;
  if (!user?.userId) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  const projectId = c.req.param('projectId');
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) {
    return c.json({ code: 404, msg: 'Project not found' }, 404);
  }

  // 全局 admin 可访问所有项目
  if (user.role === 'admin') {
    c.set('project', project);
    c.set('member', { role: 'admin' });
    return next();
  }

  const member = project.members.find(m => m.userId === user.userId);
  if (!member) {
    return c.json({ code: 403, msg: 'Access denied' }, 403);
  }

  c.set('project', project);
  c.set('member', member);
  return next();
}

export function checkPermission(
  member: { role: string } | null,
  collection: { permissions: unknown } | null,
  action: 'read' | 'write' | 'delete'
): boolean {
  // 全局 admin 拥有所有权限
  if (member?.role === 'admin') return true;

  // 如果有细粒度权限配置，使用它
  if (collection?.permissions) {
    const perms = collection.permissions as Record<string, string[]>;
    if (perms[action]?.includes(member?.role || '')) return true;
    if (perms[action]?.includes('viewer')) return true;
    return false;
  }

  // 默认规则
  if (action === 'read') return true;
  if (action === 'write') return member?.role === 'editor';
  if (action === 'delete') return member?.role === 'admin';
  return false;
}