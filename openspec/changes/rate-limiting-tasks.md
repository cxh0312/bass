# Tasks: 速率限制

## 数据库

### T1.1: 添加 RateLimitRule 模型
- 文件: `prisma/schema.prisma`
- 添加 `RateLimitRule` model

### T1.2: 运行 migrate
- 命令: `bunx prisma db push`

---

## 后端

### T2.1: 创建 rate-limits 路由
- 文件: `src/routes/rate-limits.ts`
- 实现 CRUD API:
  - `GET /admin/rate-limits`
  - `POST /admin/rate-limits`
  - `PUT /admin/rate-limits/:id`
  - `DELETE /admin/rate-limits/:id`

### T2.2: 创建速率限制中间件
- 文件: `src/middleware/rate-limit.ts`
- 功能:
  - 查询匹配的 RateLimitRule
  - 使用内存或 Redis 记录请求计数
  - 超限时返回 429 + Retry-After 头

### T2.3: 注册路由
- 文件: `src/index.ts` 或 `src/routes/admin.ts`
- 添加 `/admin/rate-limits` 路由

---

## Admin UI

### T3.1: 创建 RateLimits 页面
- 文件: `admin-ui/src/pages/RateLimits.tsx`
- 功能:
  - 规则列表 Table
  - 创建/编辑对话框
  - 删除确认

### T3.2: 添加路由
- 文件: `admin-ui/src/App.tsx`
- 路由: `/rate-limits`

### T3.3: API 函数
- 文件: `admin-ui/src/lib/api.ts`
- 添加 `getRateLimits`, `createRateLimit`, `updateRateLimit`, `deleteRateLimit`

---

## 测试

### T4.1: 单元测试
- 文件: `tests/middleware/rate-limit.test.ts`
- 测试场景:
  - 全局限流
  - 项目级限流
  - 超限返回 429

---

## 主题适配

### T5.1: 确保使用主题变量
- 检查 bg-white, bg-gray-50 等
- 使用 bg-card, bg-background
