# Mango BaaS 数据 CRUD API 设计

## 1. 概述

**目标**：为 Mango BaaS 提供通用的数据 CRUD API，支持按项目隔离、Schema 校验、细粒度权限控制。

**技术栈**：
- Web 框架：Hono 4.x
- ORM：Prisma 5.x
- 数据库：MongoDB 8.x
- 数据校验：Zod 4.x

---

## 2. 路由设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/:projectId/:collection` | 查询列表（分页/过滤/排序/字段选择） |
| POST | `/api/:projectId/:collection` | 创建数据 |
| GET | `/api/:projectId/:collection/:id` | 获取单条 |
| PUT | `/api/:projectId/:collection/:id` | 更新数据 |
| DELETE | `/api/:projectId/:collection/:id` | 删除数据 |

---

## 3. 响应格式

```json
{
  "code": 0,
  "msg": "success",
  "data": [...] | {...},
  "total": 100,
  "page": 1,
  "limit": 20
}
```

| code | 说明 |
|------|------|
| 0 | 成功 |
| 400 | 请求参数错误 / Schema 校验失败 |
| 401 | 未认证 |
| 403 | 无权限（viewer 角色尝试写操作） |
| 404 | Project 或 Collection 不存在 |
| 500 | 服务器错误 |

---

## 4. 查询参数（GET 列表）

| 参数 | 说明 | 示例 |
|------|------|------|
| `page` | 页码（默认 1） | `?page=2` |
| `limit` | 每页条数（默认 20） | `?limit=50` |
| `filter` | 过滤条件（JSON） | `?filter={"status":"active"}` |
| `sort` | 排序（`field` 升序，`-field` 降序） | `?sort=-createdAt` |
| `fields` | 字段选择（逗号分隔） | `?fields=name,email` |

---

## 5. 核心规则

### 5.1 数据隔离

- 按 Project 隔离，用户只能访问自己所在项目的数据
- 用户必须属于 Project 才能操作该 Project 下的 Collection

### 5.2 Schema 校验

- Collection 有 `strict` 字段：`true`（默认）表示严格模式，`false` 表示宽松模式
- **严格模式**：写入时按 Collection.schema 校验，不符合直接返回 400
- **宽松模式**：跳过 Schema 校验，直接写入

### 5.3 权限控制

| 角色 | 读 | 写 |
|------|----|----|
| viewer | ✅ | ❌ |
| editor | ✅ | ✅ |
| admin | ✅ | ✅ |

- viewer 角色尝试写操作 → 返回 403

### 5.4 写入数据处理

- 创建时自动注入 `createdAt`、`updatedAt`
- 更新时自动更新 `updatedAt`
- `_id` 字段禁止客户端写入

---

## 6. 数据模型

### 6.1 Prisma Schema

```prisma
model User {
  id        String   @id @default(auto())$mongocId
  email     String   @unique
  password  String   // bcrypt hashed
  name      String?
  role      Role     @default(viewer) // 全局角色：admin/editor/viewer
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  ProjectMember[]
}

model Project {
  id          String   @id @default(auto())$mongocId
  name        String
  description String?
  ownerId     String   // Creator's userId
  apiKey      String   @unique // API Key for third-party access
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  collections Collection[]
  members     ProjectMember[]
}

model Collection {
  id          String   @id @default(auto())$mongocId
  projectId   String
  name        String
  schema      Json?    // Zod schema definition
  strict      Boolean  @default(true)
  permissions Json?    // 细粒度权限规则
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  project     Project  @relation(fields: [projectId], references: [id])
  data        Data[]   // Generic data records
}

model Data {
  id           String   @id @default(auto())$mongocId
  collectionId String
  projectId    String   // Denormalized for efficient queries
  payload      Json     // The actual data
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  collection   Collection @relation(fields: [collectionId], references: [id])
}

model ProjectMember {
  id        String   @id @default(auto())$mongocId
  projectId String
  userId    String
  role      Role     @default(viewer) // 项目级角色
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
}

enum Role {
  admin
  editor
  viewer
}
```

### 6.2 认证方式

支持两种认证方式：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| JWT | Header: `Authorization: Bearer <token>` | 前端应用、移动 App |
| API Key | Header: `X-API-Key: <key>` 或 Query: `?apiKey=<key>` | 第三方服务、自动化脚本 |

- API Key 认证时，仅支持读取操作，写操作需要 JWT
- 全局 `admin` 角色可访问所有 Project 的管理接口

### 6.3 细粒度权限（Collection.permissions）

```json
{
  "read": ["viewer", "editor", "admin"],
  "write": ["editor", "admin"],
  "delete": ["admin"]
}
```

- 如果 Collection 未设置 permissions，默认遵循角色规则（viewer 只读）
- permissions 配置会覆盖默认规则

---

## 7. 错误处理

| 场景 | code | msg |
|------|------|-----|
| 成功 | 0 | success |
| Project 不存在 | 404 | Project not found |
| Collection 不存在 | 404 | Collection not found |
| 用户不在项目中 | 403 | Access denied |
| viewer 尝试写操作 | 403 | Permission denied |
| Schema 校验失败 | 400 | Validation failed: {field} |
| 数据不存在 | 404 | Data not found |
| _id 字段写入尝试 | 400 | Field _id is read-only |

---

## 8. 项目结构

```
src/
├── index.ts              # 主入口
├── db.ts                 # Prisma Client 单例
├── schemas.ts            # Zod Schema 集中定义
├── routes/
│   ├── auth.ts          # 认证路由
│   ├── data.ts          # 数据 CRUD 路由
│   └── admin.ts         # 管理路由
└── middleware/
    ├── auth.ts          # JWT 鉴权中间件
    └── rbac.ts         # 角色权限中间件
```

---

## 9. 验收标准

1. ✅ GET `/api/:projectId/:collection` 返回分页列表，支持 filter/sort/fields
2. ✅ POST 创建数据时进行 Schema 校验
3. ✅ viewer 角色写操作返回 403
4. ✅ 响应格式包含 code/msg/data/total/page/limit
5. ✅ 数据按 Project 隔离
6. ✅ 宽松模式的 Collection 跳过 Schema 校验
7. ✅ 支持 JWT 和 API Key 两种认证方式
8. ✅ Collection 可配置细粒度权限覆盖默认规则
9. ✅ 全局 admin 角色可访问管理接口
