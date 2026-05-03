# Tasks — Mango BaaS 数据 CRUD API

> 来源：APPROVED.md + plan.md

---

## 执行顺序

### Phase 1: 项目初始化

- [ ] **Task 1: 初始化项目**
  - 创建 package.json（Hono 4.x, Prisma 5.x, MongoDB 8.x, Zod 4.x）
  - 创建 tsconfig.json
  - 创建 .env
  - 创建 vitest.config.ts
  - Run: `npm install`

- [ ] **Task 2: Prisma Schema**
  - 创建 prisma/schema.prisma（User, Project, Collection, Data, ProjectMember）
  - Run: `npx prisma generate`

### Phase 2: 核心模块

- [ ] **Task 3: 数据库连接**
  - 创建 src/db.ts（Prisma Client 单例）
  - 创建 tests/db.test.ts

- [ ] **Task 4: 认证中间件**
  - 创建 src/middleware/auth.ts（JWT verify + API Key）
  - 创建 tests/middleware/auth.test.ts

- [ ] **Task 5: RBAC 中间件**
  - 创建 src/middleware/rbac.ts（projectAccess + checkPermission）
  - 创建 tests/middleware/rbac.test.ts

- [ ] **Task 6: Schema 定义**
  - 创建 src/schemas.ts（register, login, query, dataPayload, buildDynamicSchema）
  - 创建 tests/schemas.test.ts

### Phase 3: 路由实现

- [ ] **Task 7: 认证路由**
  - 创建 src/routes/auth.ts（register, login, me）
  - 创建 tests/routes/auth.test.ts（骨架，含真实行为测试 TODO）

- [ ] **Task 8: 数据 CRUD 路由**
  - 创建 src/routes/data.ts（list, create, readOne, update, delete）
  - 创建 tests/routes/data.test.ts（骨架，含真实行为测试 TODO）

- [ ] **Task 9: 管理路由**
  - 创建 src/routes/admin.ts（users, stats）
  - 创建 tests/routes/admin.test.ts（骨架，含真实行为测试 TODO）

### Phase 4: 组装与集成

- [ ] **Task 10: 主入口**
  - 创建 src/index.ts（Hono 应用组装 + 中间件 + 路由注册）

- [ ] **Task 11: 集成测试**
  - 创建 tests/integration.test.ts（健康检查）

---

## 验收标准

| 标准 | 对应 Task |
|------|-----------|
| GET /api/:projectId/:collection 返回分页列表 | Task 8 |
| POST 创建数据时进行 Schema 校验 | Task 6, Task 8 |
| viewer 角色写操作返回 403 | Task 5 |
| 响应格式包含 code/msg/data/total/page/limit | Task 8 |
| 数据按 Project 隔离 | Task 5 |
| 宽松模式的 Collection 跳过 Schema 校验 | Task 8 |
| 支持 JWT 和 API Key 认证 | Task 4 |
| Collection 可配置细粒度权限 | Task 5 |
| 全局 admin 可访问管理接口 | Task 9 |

---

## Review 修复项（已通过）

| Issue | 修复 |
|-------|------|
| P1 | auth.ts: `jwt.verify` → `verify` |
| P2 | 添加 `buildDynamicSchema()` + Zod 4.x 适配 |
| Test | 行为测试骨架 |
