# Mango BaaS

轻量级、可自托管的 Backend-as-a-Service 平台。统一认证、数据存储、业务 API，附带可视化 Admin Dashboard。

## 技术栈

| 层 | 技术 |
|---|------|
| Runtime | **Bun** / Node.js 20+ |
| Framework | **Hono** 4.x |
| Database | **MongoDB** 7.x + **Prisma** 5.x |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| Admin UI | **React** + **Vite** + **Tailwind CSS v4** + **shadcn/ui** |
| SDK | TypeScript, 零依赖 |

## 快速开始

```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 MongoDB 连接和 JWT Secret

# 3. 初始化数据库
bunx prisma db push

# 4. 启动服务
bun run dev
# Server: http://localhost:3000

# 5. 启动 Admin UI（可选）
cd admin-ui && bun install && bun run dev
# Admin: http://localhost:5173
```

## 项目结构

```
├── src/
│   ├── index.ts          # 入口，路由注册
│   ├── middleware/        # 认证、限流、Metrics
│   ├── routes/            # API 路由（auth, data, admin, webhooks...）
│   └── services/          # 业务逻辑（webhook, alerting, realtime）
├── admin-ui/              # React Admin Dashboard
│   └── src/pages/         # Users, Projects, Collections, Webhooks...
├── sdk/                   # @mango-baas/sdk 客户端 SDK
├── prisma/                # 数据模型定义
├── tests/                 # Vitest 测试
└── openspec/              # 需求与设计文档
```

## Admin Dashboard

| 页面 | 功能 |
|------|------|
| Dashboard | 系统概览、调用趋势 |
| Users | 用户管理、角色编辑 |
| Projects | 项目管理、成员管理 |
| Collections | 数据集合管理、数据浏览 |
| Webhooks | Webhook 配置、投递记录 |
| API Keys | API Key 管理 |
| Leaderboards | 排行榜创建与查看 |
| Rate Limits | 限流规则配置 |
| Audit Logs | 操作审计日志 |
| Alerts | 告警规则配置 |
| Slow Queries | 慢查询分析 |

## 核心功能

- **用户认证** — JWT 登录/注册、邮箱验证、密码重置、Token 黑名单
- **数据 CRUD** — 通用 Collection 增删改查，Schema 校验
- **API Key** — 用户级 Key 认证
- **Webhook** — 数据变更事件触发，签名验证，自动重试
- **限流** — IP/User 双维度滑动窗口限流
- **RBAC** — 角色权限，项目成员管理
- **Audit Logs** — 操作审计，可追溯
- **Leaderboard** — 排行榜，支持实时排名
- **Realtime** — SSE 实时数据推送
- **监控告警** — 慢查询、错误率、配额告警

## SDK

```typescript
import { MangoClient } from '@mango-baas/sdk'

const mango = new MangoClient({
  baseUrl: 'https://your-baas.com',
  projectId: 'your-project-id',
  apiKey: 'your-api-key'
})

// Collection CRUD
const users = mango.collection('users')
await users.create({ name: 'Alice', score: 100 })
const data = await users.query({ page: 1, limit: 20 })

// Leaderboard
await mango.leaderboard.submit('weekly', 'user-1', 999)
const top10 = await mango.leaderboard.getTop('weekly', 10)

// Realtime
const unsubscribe = mango.subscribe((event, data) => {
  console.log(event, data)
})
```

## License

MIT
