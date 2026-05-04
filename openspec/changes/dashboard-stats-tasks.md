# Tasks: Dashboard / 统计

## 数据库

### T1.1: 添加统计聚合 API（如需要）
- 文件: `src/routes/admin.ts`
- 在 `GET /admin/stats` 中添加更多统计字段

---

## 后端

### T2.1: 增强 Stats API
- 文件: `src/routes/admin.ts`
- 添加:
  - 每日 API 调用量趋势
  - 项目排行（按调用量）
  - 用户活跃度

---

## Admin UI

### T3.1: 创建 Dashboard 页面
- 文件: `admin-ui/src/pages/Dashboard.tsx`
- 功能:
  - 统计卡片：项目数、用户数、API 调用
  - 图表展示趋势（用简单的 CSS/div 实现，不依赖图表库）
  - 最近活动列表

### T3.2: 添加路由
- 文件: `admin-ui/src/App.tsx`
- 设置为默认首页（`/` 或 `/dashboard`）

### T3.3: API 函数
- 文件: `admin-ui/src/lib/api.ts`
- 添加 `getStats` 函数

### T3.4: 更新布局
- 文件: `admin-ui/src/components/layout/AdminLayout.tsx`
- 添加 Dashboard 导航入口

---

## 测试

### T4.1: Dashboard 页面测试
- 文件: `tests/pages/dashboard.test.tsx`
- 测试场景:
  - 渲染统计卡片
  - 渲染最近活动

---

## 主题适配

### T5.1: 确保使用主题变量
- 检查 bg-white, bg-gray-50 等
- 使用 bg-card, bg-background
