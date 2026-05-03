# 审计日志设计

## 概述

记录管理员操作和关键事件，用于安全审计和问题排查。

## 一、数据模型

### AuditLog

```prisma
model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  userId     String
  action     String               // 操作类型
  resource   String               // 资源类型，如 "User", "Project", "ApiKey"
  resourceId String?              // 资源 ID
  details    Json?                // 额外详情
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

## 二、操作类型

| action | 说明 | 记录时机 |
|--------|------|---------|
| `auth.login` | 用户登录 | 登录成功 |
| `auth.logout` | 用户注销 | 注销请求 |
| `auth.register` | 用户注册 | 注册成功 |
| `auth.password_reset` | 密码重置 | 重置成功 |
| `user.role_change` | 角色变更 | admin 修改用户角色 |
| `apikey.create` | 创建 API Key | 创建成功 |
| `apikey.delete` | 删除 API Key | 删除成功 |
| `webhook.create` | 创建 Webhook | 创建成功 |
| `webhook.delete` | 删除 Webhook | 删除成功 |
| `project.member_add` | 添加项目成员 | 添加成功 |
| `project.member_remove` | 移除项目成员 | 移除成功 |

## 三、API 设计

### 3.1 列出审计日志

```
GET /admin/audit-logs
Authorization: Bearer <jwt> (admin only)
```

**查询参数**
- `userId`: 过滤操作用户
- `action`: 过滤操作类型
- `resource`: 过滤资源类型
- `startDate`: 开始时间
- `endDate`: 结束时间
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20，最大 100）

**响应 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "userId": "user-xxx",
      "action": "user.role_change",
      "resource": "User",
      "resourceId": "target-user-xxx",
      "details": { "from": "viewer", "to": "editor" },
      "ip": "192.168.1.1",
      "createdAt": "2025-05-03T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

## 四、服务函数

```typescript
async function createAuditLog(params: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ip?: string
  userAgent?: string
}) {
  return db.auditLog.create({ data: params })
}
```

## 五、集成点

在以下位置调用 `createAuditLog`：

| 路由 | 操作 | 审计点 |
|------|------|-------|
| `POST /auth/login` | 登录成功 | auth.login |
| `POST /auth/logout` | 注销 | auth.logout |
| `PUT /admin/users/:id/role` | 角色变更 | user.role_change |
| `POST /api-keys` | 创建 Key | apikey.create |
| `DELETE /api-keys/:id` | 删除 Key | apikey.delete |

## 六、实现文件

```
src/
├── services/
│   └── audit.ts         # 新增 审计日志服务
├── routes/
│   ├── auth.ts          # 更新 集成审计
│   ├── admin.ts         # 更新 集成审计 + 列表 API
│   └── api-keys.ts      # 更新 集成审计
└── middleware/
    └── audit.ts         # 新增 自动审计中间件（可选）
```

## 七、验证标准

- [ ] 登录/注销产生审计日志
- [ ] 角色变更产生审计日志
- [ ] API Key 操作产生审计日志
- [ ] 审计日志列表 API 正常分页
- [ ] 日志包含正确的 IP 和 User-Agent