# Tasks: Audit Logs UI

## 后端

### T1.1: 增强 Audit Logs API
- 文件: `src/routes/admin.ts` (已有 `GET /admin/audit-logs`)
- 确认支持:
  - 分页
  - 按 userId 筛选
  - 按 action 筛选
  - 按时间范围筛选

---

## Admin UI

### T2.1: 创建 AuditLogs 页面
- 文件: `admin-ui/src/pages/AuditLogs.tsx`
- 功能:
  - Table 展示：时间、用户、操作类型、资源、操作详情
  - 筛选器：用户、操作类型、时间范围
  - 分页
  - 点击行查看详情弹窗

### T2.2: 添加路由
- 文件: `admin-ui/src/App.tsx`
- 路由: `/audit-logs`

### T2.3: API 函数
- 文件: `admin-ui/src/lib/api.ts`
- 添加 `getAuditLogs` 函数

### T2.4: 更新布局
- 文件: `admin-ui/src/components/layout/AdminLayout.tsx`
- 添加 Audit Logs 导航入口

---

## 测试

### T3.1: AuditLogs 页面测试
- 文件: `tests/pages/audit-logs.test.tsx`
- 测试场景:
  - 渲染日志列表
  - 筛选功能
  - 详情弹窗

---

## 主题适配

### T4.1: 确保使用主题变量
- 检查 bg-white, bg-gray-50 等
- 使用 bg-card, bg-background
