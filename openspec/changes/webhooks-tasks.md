# Tasks: Webhooks 管理页面

## Webhooks 页面

### T1.1: 创建 `Webhooks.tsx` 页面组件
- 文件: `admin-ui/src/pages/Webhooks.tsx`
- 功能:
  - 列出项目的所有 Webhooks（名称、URL、事件、状态）
  - 创建 Webhook（表单：名称、URL、选择事件类型）
  - 编辑 Webhook
  - 触发测试事件
  - 删除 Webhook（确认对话框）

### T1.2: 添加 Webhooks 页面路由
- 文件: `admin-ui/src/App.tsx` 或路由配置文件
- 路由: `/projects/:projectId/webhooks`

### T1.3: 在 Projects 详情页添加 Webhooks 入口
- 文件: `admin-ui/src/pages/Projects.tsx`
- 添加 "Webhooks" 按钮或 Tab

---

## Webhooks 后端（如需要）

### T2.1: 添加 projectId 查询支持
- 文件: `src/routes/webhooks.ts`
- 修改 GET `/webhooks` 支持按 projectId 查询

### T2.2: 获取单个 Webhook
- 文件: `src/routes/webhooks.ts`
- 添加 GET `/webhooks/:id` 返回完整 Webhook 信息（含 secret）

---

## 测试

### T3.1: Webhooks 页面单元测试
- 文件: `tests/pages/webhooks.test.tsx`
- 测试场景:
  - 渲染 Webhooks 列表
  - 创建 Webhook
  - 编辑 Webhook
  - 触发测试事件
  - 删除 Webhook

---

## 主题适配

### T4.1: 确保 Webhooks.tsx 使用主题变量
- 检查所有 bg-white, bg-gray-50 等硬编码颜色
- 使用 bg-card, bg-background 等语义化颜色
