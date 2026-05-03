import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key') || c.req.query('apiKey');

  // API Key 认证（仅支持读取操作）
  if (apiKey) {
    // 首先检查 Project 级别的 API Key
    const project = await db.project.findUnique({ where: { apiKey } });
    if (project) {
      c.set('project', project);
      c.set('authType', 'apiKey');
      return next();
    }

    // 检查用户级别的 API Key（通过 keyPrefix 查找）
    const keyPrefix = apiKey.slice(0, 12);
    const userApiKey = await db.apiKey.findFirst({
      where: { keyPrefix }
    });

    if (userApiKey) {
      const isValid = await bcrypt.compare(apiKey, userApiKey.key);
      if (isValid) {
        c.set('user', { userId: userApiKey.userId });
        c.set('authType', 'apiKey');
        return next();
      }
    }

    return c.json({ code: 401, msg: 'Invalid API Key' }, 401);
  }

  // JWT 认证
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    // 检查 JWT 黑名单
    const tokenId = payload.jti as string || payload.userId as string;
    const blacklisted = await db.refreshToken.findUnique({
      where: { tokenId }
    });
    if (blacklisted) {
      return c.json({ code: 401, msg: 'Token revoked' }, 401);
    }

    c.set('user', payload);
    c.set('authType', 'jwt');
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }

  return next();
}

export function verifyAuth(c: Context) {
  const authType = c.get('authType');
  if (authType === 'apiKey') {
    return { type: 'apiKey', project: c.get('project') };
  }
  return { type: 'jwt', user: c.get('user') };
}