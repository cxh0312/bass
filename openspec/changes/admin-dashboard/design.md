# Mango BaaS 管理后台技术设计

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.x |
| 构建工具 | Vite | 最新版 |
| UI 组件 | shadcn/ui | latest |
| 表格 | TanStack Table | 8.x |
| HTTP 客户端 | fetch (原生) | - |
| 后端 | Hono | 4.x |
| ORM | Prisma | 5.x |
| 数据库 | MongoDB | - |

## 目录结构

```
mango-baas/
├── admin-ui/                    # 新增：React 前端（独立项目）
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui 组件
│   │   │   ├── layout/          # 布局组件
│   │   │   └── data-view/       # 数据表格组件
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── Collections.tsx
│   │   ├── lib/
│   │   │   └── api.ts           # API 调用封装
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── src/
│   ├── routes/
│   │   └── admin.ts             # 扩展现有 Admin API
│   └── middleware/
│       └── auth.ts             # 扩展：新增 adminAuthMiddleware
└── prisma/
    └── schema.prisma            # 复用现有
```

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 权限模型 | 多 admin 支持 | 多个管理员互相管理 |
| 认证方式 | 仅 Authorization Header | 简化，无需 CSRF 防护 |
| JWT 处理 | 复用 auth 中间件 | DRY，避免 JWT_SECRET 分散 |
| 目录结构 | 分离（admin-ui + src/routes/admin.ts） | 前端独立，职责清晰 |
| Cookie 方案 | 不实现 | YAGNI，不需要 |
| 测试 | Vitest 单元测试覆盖 | 确保 API 质量 |

## API 设计

### 认证

| Method | Path | Description |
|--------|------|-------------|
| POST | /admin/auth/login | 用户名密码登录，返回 JWT |
| GET | /admin/auth/me | 获取当前用户信息 |

### 用户管理

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/users | 列表（分页） |
| GET | /admin/users/:id | 详情 |
| POST | /admin/users | 创建 |
| PUT | /admin/users/:id | 更新 |
| DELETE | /admin/users/:id | 删除 |

### 项目管理

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/projects | 列表 |
| GET | /admin/projects/:id | 详情 |
| POST | /admin/projects | 创建 |
| PUT | /admin/projects/:id | 更新 |
| DELETE | /admin/projects/:id | 删除 |

### 集合数据浏览

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/collections | 集合列表 |
| GET | /admin/collections/:id/data | 数据列表（分页） |

## 数据流

```
用户操作 (点击按钮)
    ↓
React 组件调用 api.ts
    ↓
fetch("/admin/users", { headers: { Authorization: "Bearer <token>" } })
    ↓
Hono 路由 (src/routes/admin.ts)
    ↓
adminAuthMiddleware (JWT 验证 + role 检查)
    ↓
Prisma 查询 MongoDB
    ↓
JSON 响应
    ↓
React 更新状态 + UI 刷新
```

## 关键实现点

### 1. adminAuthMiddleware 扩展

复用 `src/middleware/auth.ts` 的 JWT 验证，扩展 admin role 检查：

```typescript
// src/middleware/auth.ts 新增
export async function adminAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, msg: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(authHeader.slice(7), process.env.JWT_SECRET || 'secret');
    if (payload.role !== 'admin') {
      return c.json({ code: 403, msg: 'Admin only' }, 403);
    }
    c.set('user', payload);
    return next();
  } catch {
    return c.json({ code: 401, msg: 'Invalid token' }, 401);
  }
}
```

### 2. 前端 API 封装

`admin-ui/src/lib/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
```

### 3. shadcn/ui 组件

需要安装的组件：
- `button`, `input`, `label`, `select`
- `table`, `thead`, `tbody`, `tr`, `td`
- `dialog`, `form`
- `card`
- `dropdown-menu`
- `alert`

### 4. TanStack Table 集成

用于数据表格，包含：
- 列排序
- 分页
- 行选择

### 5. 响应式布局

使用 Tailwind CSS 的响应式类：
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- 移动端折叠侧边栏

## 数据库 Schema（现有）

复用 `prisma/schema.prisma` 中的模型：
- User
- Project
- Collection
- Data
- ProjectMember

## 测试策略

| 层级 | 工具 |
|------|------|
| 单元测试 | Vitest |
| API 测试 | 扩展现有测试 |

## 部署

| 环境 | 说明 |
|------|------|
| 开发 | Vite Dev Server (`localhost:5173`) + Hono (`localhost:3000`) |
| 生产 | 构建 React 静态文件，Hono 服务统一托管 |

生产构建：
```bash
cd admin-ui && npm run build
# Hono 静态文件服务或 Nginx 反向代理
```