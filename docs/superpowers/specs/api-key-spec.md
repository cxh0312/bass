# API Key 管理设计

## 概述

为第三方服务提供 API Key 认证能力，采用简化方案（不支持权限细分）。

## 一、数据模型

### ApiKey

```prisma
model ApiKey {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String              // Key 名称，如 "iOS App", "数据分析平台"
  key       String   @unique    // 存储 bcrypt 哈希
  keyPrefix String              // 前缀，用于显示，如 "mba_sk_xxx"
  userId    String
  projectId String?
  lastUsed  DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- `keyPrefix`：显示给用户的前缀，实际调用时使用完整 key
- `projectId`：可选，限制 Key 只能访问特定项目

## 二、API 设计

### 2.1 创建 API Key

```
POST /api-keys
Authorization: Bearer <jwt>
```

**请求**
```json
{
  "name": "iOS App",
  "projectId": "optional-project-id"
}
```

**响应 201**
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "iOS App",
    "key": "mba_sk_a1b2c3d4e5f6...",  // 只在此返回一次
    "keyPrefix": "mba_sk_a1b2c3",
    "createdAt": "2025-05-03T12:00:00Z"
  }
}
```

**注意**：`key` 只有创建时返回，后续无法查看完整值

### 2.2 列出 API Key

```
GET /api-keys
Authorization: Bearer <jwt>
```

**响应 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "iOS App",
      "keyPrefix": "mba_sk_a1b2c3",
      "lastUsed": "2025-05-03T12:00:00Z",
      "createdAt": "2025-05-03T12:00:00Z"
    }
  ]
}
```

### 2.3 删除 API Key

```
DELETE /api-keys/:id
Authorization: Bearer <jwt>
```

**响应 200**
```json
{
  "success": true,
  "message": "API Key deleted"
}
```

## 三、认证流程

### 3.1 Header 认证

```
X-API-Key: mba_sk_a1b2c3d4e5f6g7h8i9j0
```

### 3.2 中间件逻辑

```typescript
async function apiKeyAuth(c: Context, next: Next) {
  const key = c.req.header('X-API-Key')
  if (!key) return c.json({ error: 'MISSING_API_KEY' }, 401)

  const hashedKey = await hash(key, 10)
  const apiKey = await db.apiKey.findFirst({
    where: { key: hashedKey }
  })

  if (!apiKey) return c.json({ error: 'INVALID_API_KEY' }, 401)

  // 更新最后使用时间
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() }
  })

  // 注入用户信息到 context
  c.set('userId', apiKey.userId)
  c.set('apiKeyId', apiKey.id)

  return next()
}
```

## 四、Key 生成规则

```
前缀: mba_sk_
随机: 32 字符随机字符串
完整: mba_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

- 生成时存储 `bcrypt(完整key)`
- 查询时用 `keyPrefix` 辅助识别

## 五、实现文件

```
src/
├── routes/
│   └── api-keys.ts      # 新增 API Key CRUD 路由
├── middleware/
│   └── api-key.ts       # 新增 API Key 认证中间件
└── schemas.ts           # 新增 Zod schema
```

## 六、验证标准

- [ ] 创建 API Key 返回完整 key（一次性）
- [ ] 列出 API Key 只显示 keyPrefix
- [ ] 使用正确 API Key 能通过认证
- [ ] 使用错误 API Key 返回 401
- [ ] 删除后 API Key 失效