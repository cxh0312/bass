# Mango BaaS 功能补全实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Mango BaaS 补全认证增强、API Key、Webhook、限流、审计日志、查询增强功能

**Architecture:** 基于现有 Hono + Prisma + MongoDB 架构，新增功能模块化实现，遵循现有代码风格

**Tech Stack:** Hono, Prisma, MongoDB, bcrypt, jsonwebtoken, Zod

---

## 实施范围

本计划涵盖 6 个功能模块，按依赖顺序实现：

1. **auth-enhanced** - 认证增强（邮箱验证、密码重置、JWT 注销）
2. **api-key** - API Key 管理
3. **rate-limit** - 滑动窗口限流
4. **audit-log** - 审计日志
5. **webhook** - Webhook 系统
6. **query-api** - 分页/排序/过滤查询

---

## 文件变更总览

### 新增文件

```
mango-baas/src/
├── services/
│   ├── audit.ts              # 审计日志服务
│   ├── rate-limit.ts         # 限流服务
│   └── webhook.ts            # Webhook 触发/投递服务
├── jobs/
│   ├── cleanup-tokens.ts     # 清理过期 token
│   └── webhook-retry.ts      # Webhook 重试任务
├── routes/
│   ├── api-keys.ts           # API Key CRUD
│   ├── webhooks.ts           # Webhook CRUD
│   └── auth-enhanced.ts      # 认证增强路由（与 auth.ts 合并）
├── middleware/
│   ├── api-key.ts            # API Key 认证中间件
│   └── rate-limit.ts         # 限流中间件
└── utils/
    └── crypto.ts             # 加密工具函数
```

### 修改文件

```
mango-baas/src/
├── index.ts                  # 注册新路由
├── auth.ts                  # 更新 JWT 逻辑，添加黑名单检查
├── schemas.ts               # 添加新 Zod schema
├── routes/
│   ├── auth.ts              # 添加 logout + 集成审计
│   ├── admin.ts             # 添加审计日志列表 API
│   └── data.ts              # 集成限流 + Webhook 触发
└── prisma/
    └── schema.prisma         # 添加新数据模型
```

---

## Task 1: Prisma Schema 更新

**Files:**
- Modify: `mango-baas/prisma/schema.prisma:68-72`

**变更内容:** 在 schema.prisma 末尾添加新模型

```prisma
// JWT 黑名单
model RefreshToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  tokenId   String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// 无状态密码重置 Token（备用，简单起见用 JWT 实现）
model PasswordResetToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

// API Key
model ApiKey {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  key       String   @unique
  keyPrefix String
  userId    String
  projectId String?
  lastUsed  DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Webhook
model Webhook {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  projectId String
  name      String
  url       String
  events    String[]
  secret    String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Webhook 投递记录
model WebhookDelivery {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  webhookId   String
  event       String
  payload     Json
  response    String?
  statusCode  Int?
  success     Boolean  @default(false)
  attempt     Int      @default(1)
  nextRetryAt DateTime?
  createdAt   DateTime @default(now())
}

// 审计日志
model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  userId     String
  action     String
  resource   String
  resourceId String?
  details    Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
}

// 限流记录
model RateLimitRecord {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  identifier String
  windowStart DateTime
  count      Int      @default(1)
  createdAt  DateTime @default(now())

  @@unique([identifier, windowStart])
}
```

- [ ] **Step 1: 修改 schema.prisma**

在 `enum Role { ... }` 后添加以上新模型

- [ ] **Step 2: 运行 Prisma 迁移**

```bash
cd mango-baas && npx prisma db push
```

预期输出: `Your database has been set up...`

---

## Task 2: Auth Enhanced - 认证增强

**Files:**
- Create: `mango-baas/src/routes/auth-enhanced.ts`
- Modify: `mango-baas/src/auth.ts`, `mango-baas/src/routes/auth.ts:58-82`, `mango-baas/src/schemas.ts`

- [ ] **Step 1: 添加 Zod schema**

在 `mango-baas/src/schemas.ts` 末尾添加:

```typescript
// 邮箱验证 Schema
export const sendVerificationSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

// 密码重置 Schema
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});
```

- [ ] **Step 2: 创建 auth-enhanced.ts 路由**

创建 `mango-baas/src/routes/auth-enhanced.ts`:

```typescript
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { sendVerificationSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas.js';
import { createAuditLog } from '../services/audit.js';

export const authEnhancedRoutes = new Hono();

// 发送邮箱验证链接（Mock 实现）
authEnhancedRoutes.post('/send-verification', async (c) => {
  const body = await c.req.json();
  const result = sendVerificationSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { email } = result.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // 安全考虑，不暴露用户是否存在
    return c.json({ success: true, message: 'Verification email sent' });
  }

  const token = await sign(
    { userId: user.id, email, purpose: 'email-verify' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  );

  // Mock: 输出到控制台
  console.log(`[Email Verify] Token for ${email}: ${token}`);

  await db.user.update({
    where: { id: user.id },
    data: { verificationToken: token }
  });

  return c.json({ success: true, message: 'Verification email sent' });
});

// 验证邮箱
authEnhancedRoutes.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const result = verifyEmailSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { token } = result.data;

  try {
    const { verify } = await import('hono/jwt');
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.purpose !== 'email-verify') {
      return c.json({ success: false, error: 'INVALID_TOKEN' }, 400);
    }

    await db.user.update({
      where: { id: payload.userId as string },
      data: { emailVerified: true, verificationToken: null }
    });

    return c.json({ success: true, message: 'Email verified' });
  } catch {
    return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
  }
});

// 请求密码重置（Mock 实现）
authEnhancedRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const result = forgotPasswordSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { email } = result.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return c.json({ success: true, message: 'Password reset email sent' });
  }

  // 生成无状态 JWT 作为重置 token
  const token = await sign(
    { userId: user.id, purpose: 'password-reset' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  // Mock: 输出到控制台
  console.log(`[Password Reset] Token for ${email}: ${token}`);

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) }
  });

  return c.json({ success: true, message: 'Password reset email sent' });
});

// 重置密码
authEnhancedRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const result = resetPasswordSchema.safeParse(body);

  if (!result.success) {
    return c.json({ code: 400, msg: 'Validation failed' }, 400);
  }

  const { token, newPassword } = result.data;

  try {
    const { verify } = await import('hono/jwt');
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.purpose !== 'password-reset') {
      return c.json({ success: false, error: 'INVALID_TOKEN' }, 400);
    }

    // 检查 token 是否已使用
    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
    }

    // 更新密码
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: payload.userId as string },
      data: { password: hashed }
    });

    // 标记 token 已使用
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

    return c.json({ success: true, message: 'Password reset successful' });
  } catch {
    return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Token invalid or expired' }, 400);
  }
});

// 注销（JWT 黑名单）
authEnhancedRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const { verify } = await import('hono/jwt');
    const payload = await verify(token, process.env.JWT_SECRET || 'secret');

    if (payload.exp) {
      await db.refreshToken.create({
        data: {
          tokenId: payload.jti as string || payload.userId as string,
          userId: payload.userId as string,
          expiresAt: new Date(payload.exp * 1000)
        }
      });
    }

    const ip = c.req.header('x-forwarded-for') || c.var.ip;
    const userAgent = c.req.header('user-agent');
    await createAuditLog({
      userId: payload.userId as string,
      action: 'auth.logout',
      resource: 'User',
      ip,
      userAgent
    });

    return c.json({ success: true, message: 'Logged out' });
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
});
```

- [ ] **Step 3: 更新 auth.ts 中间件检查黑名单**

修改 `mango-baas/src/middleware/auth.ts`:

```typescript
import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { db } from '../db.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key') || c.req.query('apiKey');

  // API Key 认证
  if (apiKey) {
    const project = await db.project.findUnique({ where: { apiKey } });
    if (!project) {
      return c.json({ code: 401, msg: 'Invalid API Key' }, 401);
    }
    c.set('project', project);
    c.set('authType', 'apiKey');
    return next();
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
```

- [ ] **Step 4: 注册路由**

修改 `mango-baas/src/index.ts`:

```typescript
import { authEnhancedRoutes } from './routes/auth-enhanced.js';

// 在 app.route('/auth', authRoutes); 后添加
app.route('/auth', authEnhancedRoutes);
```

- [ ] **Step 5: 验证**

```bash
cd mango-baas && npm run dev
# 测试: POST /auth/send-verification
# 测试: POST /auth/verify-email
# 测试: POST /auth/forgot-password
# 测试: POST /auth/reset-password
# 测试: POST /auth/logout
```

---

## Task 3: API Key 管理

**Files:**
- Create: `mango-baas/src/routes/api-keys.ts`
- Create: `mango-baas/src/middleware/api-key.ts`
- Modify: `mango-baas/src/schemas.ts`, `mango-baas/src/index.ts`

- [ ] **Step 1: 添加 Zod schema**

```typescript
// API Key Schema
export const createApiKeySchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
});
```

- [ ] **Step 2: 创建 API Key 路由** `mango-baas/src/routes/api-keys.ts`

```typescript
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

  const ip = c.req.header('x-forwarded-for') || c.var.ip;
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

  const ip = c.req.header('x-forwarded-for') || c.var.ip;
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
```

- [ ] **Step 3: 创建审计日志服务（前置依赖）** `mango-baas/src/services/audit.ts`

```typescript
import { db } from '../db.js';

export async function createAuditLog(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}) {
  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details || undefined,
      ip: params.ip || null,
      userAgent: params.userAgent || null
    }
  });
}
```

- [ ] **Step 4: 注册路由**

修改 `mango-baas/src/index.ts`:

```typescript
import { apiKeyRoutes } from './routes/api-keys.js';

// 添加路由
app.route('/api-keys', apiKeyRoutes);
```

- [ ] **Step 5: 验证**

```bash
# POST /api-keys (创建)
# GET /api-keys (列表)
# DELETE /api-keys/:id (删除)
```

---

## Task 4: Rate Limiting

**Files:**
- Create: `mango-baas/src/services/rate-limit.ts`
- Create: `mango-baas/src/middleware/rate-limit.ts`
- Modify: `mango-baas/src/index.ts`, `mango-baas/src/routes/data.ts`

- [ ] **Step 1: 创建限流服务** `mango-baas/src/services/rate-limit.ts`

```typescript
import { db } from '../db.js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

const WINDOW_MS = 60 * 1000; // 1 分钟

export async function checkRateLimit(
  identifier: string,
  limit: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const windowKey = `${identifier}:${Math.floor(Date.now() / WINDOW_MS)}`;

  const existing = await db.rateLimitRecord.findUnique({
    where: {
      identifier_windowStart: { identifier, windowStart }
    }
  });

  if (!existing) {
    await db.rateLimitRecord.create({
      data: { identifier, windowStart, count: 1 }
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil((existing.windowStart.getTime() + WINDOW_MS) / 1000)
    };
  }

  await db.rateLimitRecord.update({
    where: { id: existing.id },
    data: { count: { increment: 1 } }
  });

  return { allowed: true, remaining: limit - existing.count - 1 };
}

// 清理过期记录
export async function cleanupRateLimits() {
  const cutoff = new Date(Date.now() - WINDOW_MS * 2);
  await db.rateLimitRecord.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });
}
```

- [ ] **Step 2: 创建限流中间件** `mango-baas/src/middleware/rate-limit.ts`

```typescript
import { Context, Next } from 'hono';
import { checkRateLimit } from '../services/rate-limit.js';

const IP_LIMIT = 100;
const USER_LIMIT = 1000;

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] || c.var.ip || 'unknown';
  const user = c.get('user') as { userId: string } | undefined;
  const authType = c.get('authType');

  let identifier = ip;
  let limit = IP_LIMIT;

  if (authType === 'jwt' && user) {
    identifier = `user:${user.userId}`;
    limit = USER_LIMIT;
  }

  const result = await checkRateLimit(identifier, limit);

  c.header('X-RateLimit-Limit', String(limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    const retryAfter = result.resetAt ? result.resetAt - Math.floor(Date.now() / 1000) : 60;
    c.header('Retry-After', String(retryAfter));
    return c.json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter
    }, 429);
  }

  return next();
}
```

- [ ] **Step 3: 集成限流到 data 路由**

修改 `mango-baas/src/routes/data.ts` 第一行:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db.js';
import { querySchema, createDataSchema, updateDataSchema } from '../schemas.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';

export const dataRoutes = new Hono();

// 在所有 data 路由上应用限流中间件
dataRoutes.use('/*', rateLimitMiddleware);
```

- [ ] **Step 4: 验证**

```bash
# 快速请求测试限流响应头
curl -I http://localhost:3000/api/...
# 应看到 X-RateLimit-Limit, X-RateLimit-Remaining
```

---

## Task 5: Audit Log

**Files:**
- Modify: `mango-baas/src/routes/admin.ts`
- Modify: `mango-baas/src/routes/auth.ts`

- [ ] **Step 1: 添加审计日志列表 API**

修改 `mango-baas/src/routes/admin.ts`:

```typescript
// 在 adminRoutes 开头添加
adminRoutes.get('/audit-logs', async (c) => {
  const auth = c.get('user') as { userId: string; role: string };
  if (auth.role !== 'admin') {
    return c.json({ code: 403, msg: 'Forbidden' }, 403);
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const userId = c.req.query('userId');
  const action = c.req.query('action');
  const resource = c.req.query('resource');

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    db.auditLog.count({ where })
  ]);

  return c.json({
    success: true,
    data: logs,
    pagination: { page, limit, total }
  });
});
```

- [ ] **Step 2: 在 auth.ts 中集成审计**

在 `mango-baas/src/routes/auth.ts` 的登录成功处添加:

```typescript
import { createAuditLog } from '../services/audit.js';

// 登录成功后添加:
const ip = c.req.header('x-forwarded-for') || c.var.ip;
const userAgent = c.req.header('user-agent');
await createAuditLog({
  userId: user.id,
  action: 'auth.login',
  resource: 'User',
  ip,
  userAgent
});
```

- [ ] **Step 3: 验证**

```bash
# GET /admin/audit-logs?page=1&limit=20
```

---

## Task 6: Webhook 系统

**Files:**
- Create: `mango-baas/src/services/webhook.ts`
- Create: `mango-baas/src/routes/webhooks.ts`
- Modify: `mango-baas/src/routes/data.ts`

- [ ] **Step 1: 创建 Webhook 服务** `mango-baas/src/services/webhook.ts`

```typescript
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
    where: { id: deliveryId },
    include: { /* webhook relation */ }
  });
  // 重试逻辑...
}
```

- [ ] **Step 2: 创建 Webhook 路由** `mango-baas/src/routes/webhooks.ts`

```typescript
import { Hono } from 'hono';
import crypto from 'crypto';
import { db } from '../db.js';
import { createAuditLog } from '../services/audit.js';

export const webhookRoutes = new Hono();

webhookRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const auth = c.get('user') as { userId: string };

  const { projectId, name, url, events } = body;

  if (!projectId || !name || !url || !events?.length) {
    return c.json({ code: 400, msg: 'Missing required fields' }, 400);
  }

  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await db.webhook.create({
    data: { projectId, name, url, events, secret }
  });

  const ip = c.req.header('x-forwarded-for') || c.var.ip;
  const userAgent = c.req.header('user-agent');
  await createAuditLog({ userId: auth.userId, action: 'webhook.create', resource: 'Webhook', resourceId: webhook.id, ip, userAgent });

  return c.json({
    success: true,
    data: { ...webhook, secret }
  }, 201);
});

webhookRoutes.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  const auth = c.get('user') as { userId: string };

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
  const auth = c.get('user') as { userId: string };

  await db.webhook.delete({ where: { id } });

  await createAuditLog({ userId: auth.userId, action: 'webhook.delete', resource: 'Webhook', resourceId: id });

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
```

- [ ] **Step 3: 在数据操作中触发 Webhook**

修改 `mango-baas/src/routes/data.ts`:

```typescript
import { triggerWebhooks } from '../services/webhook.js';

// 在 create data 后添加:
await triggerWebhooks(projectId, 'create', { collectionId, recordId: data.id, payload: body });

// 在 update data 后添加:
await triggerWebhooks(projectId, 'update', { collectionId, recordId: id, payload: body });

// 在 delete data 后添加:
await triggerWebhooks(projectId, 'delete', { collectionId, recordId: id, payload: {} });
```

- [ ] **Step 4: 注册路由**

```typescript
import { webhookRoutes } from './routes/webhooks.js';
app.route('/webhooks', webhookRoutes);
```

- [ ] **Step 5: 验证**

```bash
# POST /webhooks (创建)
# GET /webhooks (列表)
# DELETE /webhooks/:id (删除)
# POST /webhooks/:id/test (测试)
```

---

## Task 7: 查询 API 增强

**Files:**
- Modify: `mango-baas/src/routes/data.ts`

- [ ] **Step 1: 更新查询逻辑**

修改 `mango-baas/src/routes/data.ts` 中 `GET /:projectId/:collection` 部分:

```typescript
dataRoutes.get('/:projectId/:collection', async (c) => {
  const { projectId, collection } = c.req.param();
  const { page, limit, sort, filter, fields, search } = c.req.query();

  const collectionRecord = await db.collection.findFirst({
    where: { projectId, name: collection }
  });

  if (!collectionRecord) {
    return c.json({ code: 404, msg: 'Collection not found' }, 404);
  }

  const pageNum = parseInt(page || '1');
  const limitNum = Math.min(parseInt(limit || '20'), 100);
  const skip = (pageNum - 1) * limitNum;

  // 构建查询
  const where: any = { projectId, collectionId: collectionRecord.id };

  // 过滤
  if (filter) {
    try {
      const filterObj = JSON.parse(filter);
      Object.keys(filterObj).forEach(key => {
        if (typeof filterObj[key] === 'object') {
          where[`payload.${key}`] = filterObj[key];
        } else {
          where[`payload.${key}`] = filterObj[key];
        }
      });
    } catch {}
  }

  // 搜索
  if (search) {
    where.OR = [
      { 'payload.name': { contains: search, mode: 'insensitive' } },
      { 'payload.title': { contains: search, mode: 'insensitive' } },
      { 'payload.description': { contains: search, mode: 'insensitive' } }
    ];
  }

  // 排序
  let orderBy: any = { createdAt: 'desc' };
  if (sort) {
    const [field, dir] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
    orderBy = { [`payload.${field}`]: dir };
  }

  const [data, total] = await Promise.all([
    db.data.findMany({
      where,
      orderBy,
      skip,
      take: limitNum
    }),
    db.data.count({ where })
  ]);

  return c.json({
    success: true,
    data,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  });
});
```

- [ ] **Step 2: 验证**

```bash
# GET /api/project1/tasks?page=1&limit=10&sort=-createdAt&filter={"status":"active"}&search=keyword
```

---

## Task 8: 清理任务

**Files:**
- Create: `mango-baas/src/jobs/cleanup.ts`

```typescript
import { db } from '../db.js';
import { cleanupRateLimits } from '../services/rate-limit.js';

async function cleanup() {
  console.log('Running cleanup jobs...');

  // 清理过期的 RefreshToken
  await db.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });

  // 清理过期的 PasswordResetToken
  await db.passwordResetToken.deleteMany({
    where: { OR: [
      { used: true },
      { expiresAt: { lt: new Date() } }
    ]}
  });

  // 清理限流记录
  await cleanupRateLimits();

  // 重试失败的 Webhook（最多 3 次）
  const failedDeliveries = await db.webhookDelivery.findMany({
    where: {
      success: false,
      attempt: { lt: 3 },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lt: new Date() } }
      ]
    }
  });

  for (const delivery of failedDeliveries) {
    const webhook = await db.webhook.findUnique({ where: { id: delivery.webhookId } });
    if (webhook) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempt: { increment: 1 },
          nextRetryAt: new Date(Date.now() + getRetryDelay(delivery.attempt + 1))
        }
      });
      // trigger retry...
    }
  }

  console.log('Cleanup complete');
}

function getRetryDelay(attempt: number): number {
  const delays = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000]; // 1min, 5min, 30min
  return delays[attempt - 1] || 30 * 60 * 1000;
}

// 运行一次
cleanup().catch(console.error);
```

---

## 实施顺序

1. Task 1: Prisma Schema 更新（基础设施）
2. Task 2: Auth Enhanced（基础认证）
3. Task 3: API Key（依赖 auth）
4. Task 4: Rate Limiting（基础设施）
5. Task 5: Audit Log（依赖 rate-limit 服务）
6. Task 6: Webhook（依赖 audit）
7. Task 7: Query API（独立功能）
8. Task 8: 清理任务（汇总）

---

## 验证命令

```bash
cd mango-baas && npm run dev

# 测试认证增强
curl -X POST http://localhost:3000/auth/send-verification -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
curl -X POST http://localhost:3000/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
curl -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer <token>"

# 测试 API Key
curl -X POST http://localhost:3000/api-keys -H "Authorization: Bearer <token>" -d '{"name":"Test Key"}'
curl http://localhost:3000/api-keys -H "Authorization: Bearer <token>"
curl -X DELETE http://localhost:3000/api-keys/<id> -H "Authorization: Bearer <token>"

# 测试限流
curl -I http://localhost:3000/api/project1/tasks -H "X-API-Key: <key>"

# 测试查询增强
curl "http://localhost:3000/api/project1/tasks?page=1&limit=10&sort=-createdAt&filter={\"status\":\"active\"}&search=task"

# 测试 Webhook
curl -X POST http://localhost:3000/webhooks -H "Authorization: Bearer <token>" -d '{"projectId":"xxx","name":"Test","url":"https://example.com/webhook","events":["create","update"]}'
```

---

**Plan 完成，保存至:** `docs/superpowers/plans/2025-05-03-mango-baas-feature-completion.md`

---

**两种执行方式：**

**1. Subagent-Driven (推荐)** - 我派发独立 subagent 执行每个 task，task 间review

**2. Inline Execution** - 在当前 session 中使用 executing-plans 批量执行，带检查点

你选择哪种方式？