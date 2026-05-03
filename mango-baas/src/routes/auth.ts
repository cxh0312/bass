import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { registerSchema, loginSchema } from '../schemas.js';

export const authRoutes = new Hono();

// 注册
authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed', errors: result.error.flatten() }, 400);
  }

  const { email, password, name } = result.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ code: 400, msg: 'Email already registered' }, 400);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, password: hashed, name },
  });

  return c.json({ code: 0, msg: 'success', data: { id: user.id, email: user.email, name: user.name } });
});

// 登录
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { email, password } = result.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return c.json({ code: 401, msg: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return c.json({ code: 401, msg: 'Invalid credentials' }, 401);
  }

  const payload = { userId: user.id, role: user.role };
  const token = await sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

  return c.json({ code: 0, msg: 'success', data: { token, user: { id: user.id, email: user.email, role: user.role } } });
});

// 获取当前用户
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(authHeader.slice(7), process.env.JWT_SECRET || 'secret');
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return c.json({ code: 404, msg: 'User not found' }, 404);
    }

    return c.json({ code: 0, msg: 'success', data: user });
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
});