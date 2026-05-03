# Rate Limiting 设计

## 概述

滑动窗口限流，基于 IP 和 User ID 双维度，保护后端资源。

## 一、数据模型

### RateLimitRecord

```prisma
model RateLimitRecord {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  identifier String              // IP 或 User ID
  windowStart DateTime          // 窗口开始时间
  count      Int     @default(1)
  createdAt DateTime @default(now())

  @@unique([identifier, windowStart])
}
```

## 二、限流规则

| 维度 | 限制 | 窗口 |
|------|------|------|
| IP | 100 req | 1 分钟 |
| User (登录后) | 1000 req | 1 分钟 |
| API Key | 500 req | 1 分钟 |

### 2.1 响应头

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1714737600  // Unix timestamp
```

### 2.2 超限响应

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "retryAfter": 45
}
```

HTTP Status: 429

## 三、滑动窗口算法

```typescript
async function checkRateLimit(identifier: string, limit: number, windowMs: number) {
  const windowStart = new Date(Date.now() - windowMs)
  const windowKey = `${identifier}:${Math.floor(Date.now() / windowMs)}`

  const record = await db.rateLimitRecord.findUnique({
    where: { identifier_windowStart: { identifier, windowStart } }
  })

  if (!record) {
    // 新窗口，插入第一条记录
    await db.rateLimitRecord.create({
      data: { identifier, windowStart, count: 1 }
    })
    return { allowed: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    // 超限
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil((record.windowStart.getTime() + windowMs) / 1000)
    }
  }

  // 窗口内计数 +1
  await db.rateLimitRecord.update({
    where: { id: record.id },
    data: { count: { increment: 1 } }
  })

  return { allowed: true, remaining: limit - record.count - 1 }
}
```

## 四、中间件

```typescript
async function rateLimit(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || c.var.ip
  const userId = c.get('userId')
  const identifier = userId || ip

  const result = await checkRateLimit(identifier, 100, 60000)

  // 设置响应头
  c.header('X-RateLimit-Limit', '100')
  c.header('X-RateLimit-Remaining', String(result.remaining))

  if (!result.allowed) {
    return c.json({
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.resetAt - Math.floor(Date.now() / 1000)
    }, 429)
  }

  return next()
}
```

## 五、清理机制

定时任务清理过期的 RateLimitRecord（保留最近 2 分钟的数据）。

## 六、实现文件

```
src/
├── middleware/
│   └── rate-limit.ts    # 新增 限流中间件
├── services/
│   └── rate-limit.ts   # 新增 限流服务
└── jobs/
    └── cleanup-rate-limits.ts  # 新增 清理任务
```

## 七、验证标准

- [ ] 限流中间件正确拦截超限请求
- [ ] 响应头正确返回 limit/remaining
- [ ] IP 和 User ID 分开计数
- [ ] 窗口滑动正常
- [ ] 过期记录被清理