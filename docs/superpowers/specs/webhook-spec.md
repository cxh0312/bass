# Webhook 系统设计

## 概述

支持配置 Webhook URL，监听数据变更事件（create/update/delete），带签名验证和重试机制。

## 一、数据模型

### Webhook

```prisma
model Webhook {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  projectId String
  url       String
  name      String              // Webhook 名称
  events    String[]            // ["create", "update", "delete"]
  secret    String   @unique    // HMAC-SHA256 签名密钥
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### WebhookDelivery

```prisma
model WebhookDelivery {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  webhookId   String
  event       String               // "create" | "update" | "delete"
  payload     Json
  response    String?              // 响应体（截断）
  statusCode  Int?
  success     Boolean @default(false)
  attempt     Int     @default(1)
  nextRetryAt  DateTime?
  createdAt   DateTime @default(now())
}
```

## 二、API 设计

### 2.1 创建 Webhook

```
POST /webhooks
Authorization: Bearer <jwt>
```

**请求**
```json
{
  "projectId": "project-xxx",
  "name": "数据同步",
  "url": "https://example.com/webhook",
  "events": ["create", "update", "delete"]
}
```

**响应 201**
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "数据同步",
    "url": "https://example.com/webhook",
    "events": ["create", "update", "delete"],
    "secret": "whsec_xxx",  // 只在此返回一次
    "active": true,
    "createdAt": "2025-05-03T12:00:00Z"
  }
}
```

### 2.2 列出 Webhook

```
GET /webhooks?projectId=xxx
Authorization: Bearer <jwt>
```

### 2.3 更新 Webhook

```
PUT /webhooks/:id
Authorization: Bearer <jwt>
```

### 2.4 删除 Webhook

```
DELETE /webhooks/:id
Authorization: Bearer <jwt>
```

### 2.5 测试 Webhook

```
POST /webhooks/:id/test
Authorization: Bearer <jwt>
```

发送测试事件到 webhook URL，验证连通性。

## 三、事件触发

### 3.1 事件数据结构

```json
{
  "id": "delivery-xxx",
  "type": "data.create",
  "timestamp": "2025-05-03T12:00:00Z",
  "data": {
    "projectId": "xxx",
    "collection": "tasks",
    "recordId": "yyy",
    "payload": { ... }
  }
}
```

### 3.2 签名机制

Header: `X-Webhook-Signature: sha256=xxx`

签名计算：
```javascript
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex')
```

### 3.3 重试机制

| 重试次数 | 延迟 |
|---------|------|
| 1 | 1 分钟 |
| 2 | 5 分钟 |
| 3 | 30 分钟 |

最大重试 3 次，3 次失败后记录失败状态。

## 四、异步投递

```typescript
// 数据变更时，触发 Webhook
async function triggerWebhooks(projectId: string, event: string, data: any) {
  const webhooks = await db.webhook.findMany({
    where: { projectId, active: true, events: { has: event } }
  })

  for (const webhook of webhooks) {
    await enqueueWebhookDelivery(webhook, event, data)
  }
}
```

- 使用队列异步投递，不阻塞主请求
- 投递记录存入 WebhookDelivery 表

## 五、实现文件

```
src/
├── services/
│   └── webhook.ts       # 新增 Webhook 触发/投递服务
├── routes/
│   └── webhooks.ts      # 新增 Webhook CRUD 路由
├── jobs/
│   └── webhook-retry.ts # 新增 重试任务（定时扫描）
└── schemas.ts           # 新增 Zod schema
```

## 六、验证标准

- [ ] 创建 Webhook 返回 secret（一次性）
- [ ] 数据变更触发 Webhook 投递
- [ ] 签名正确验证通过
- [ ] 失败重试 3 次
- [ ] 投递记录可查询