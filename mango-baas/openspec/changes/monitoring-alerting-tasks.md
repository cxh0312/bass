# Tasks: 监控告警体系

## 数据库

### T1.1: 添加 ApiMetrics 模型
- 文件: `prisma/schema.prisma`
- 添加 `ApiMetrics` 模型
- 索引: `(projectId, timestamp)`

### T1.2: 运行 migrate
- 命令: `bunx prisma db push`

---

## 后端

### T2.1: Metrics 中间件
- 文件: `src/middleware/metrics.ts`（新）
- 记录每个 API 调用的：endpoint, method, statusCode, durationMs, timestamp
- 异步记录，不阻塞主流程

### T2.2: 告警检查逻辑
- 文件: `src/services/alerting.ts`（新）
- 检查错误率、响应时间、配额使用
- 超阈值时触发告警

### T2.3: 告警通知
- 文件: `src/services/notifications.ts`（新）
- 支持 Webhook 通知
- 邮件通知（可选，使用 nodemailer）

### T2.4: 慢查询日志
- 文件: `src/services/slow-query.ts`（新）
- 记录 durationMs > 1000ms 的请求

### T2.5: 告警规则 API
- 文件: `src/routes/alerts.ts`（新）
- CRUD 告警规则

---

## Admin UI

### T3.1: 系统 Dashboard 增强
- 文件: `admin-ui/src/pages/Dashboard.tsx`
- 添加：调用量趋势、错误率、平均响应时间

### T3.2: 项目级用量统计
- 文件: `admin-ui/src/pages/ProjectUsage.tsx`（新）
- 每日/每周/每月 API 调用量
- Top Endpoints

### T3.3: 慢查询日志页面
- 文件: `admin-ui/src/pages/SlowQueries.tsx`（新）
- Table 展示慢查询记录

### T3.4: 告警规则配置
- 文件: `admin-ui/src/pages/AlertRules.tsx`（新）
- 创建/编辑/删除告警规则

### T3.5: 路由
- 文件: `admin-ui/src/App.tsx`
- 添加相关路由
