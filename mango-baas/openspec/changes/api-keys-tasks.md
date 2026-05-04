# Tasks: API Keys 管理页面

## API Keys 页面

### T1.1: 创建 `ApiKeys.tsx` 页面组件
- 文件: `admin-ui/src/pages/ApiKeys.tsx`
- 功能:
  - 列出项目的所有 API Keys（名称、前缀、创建时间、最后使用时间）
  - 创建 API Key（表单：名称）
  - 删除 API Key（确认对话框）
  - 显示原始 key（创建后一次性显示）

### T1.2: 添加 API Keys 页面路由
- 文件: `admin-ui/src/App.tsx` 或路由配置文件
- 路由: `/projects/:projectId/api-keys`

### T1.3: 在 Projects 详情页添加 API Keys 入口
- 文件: `admin-ui/src/pages/Projects.tsx`
- 添加 "API Keys" 按钮或 Tab

---

## API Keys 后端（如需要）

### T2.1: 添加 projectId 查询支持
- 文件: `src/routes/api-keys.ts`
- 修改 GET `/api/keys` 支持 `projectId` 参数查询

---

## 测试

### T3.1: API Keys 页面单元测试
- 文件: `tests/pages/api-keys.test.tsx`（如使用 Vitest + React Testing Library）
- 测试场景:
  - 渲染 API Keys 列表
  - 创建 API Key 并显示 key
  - 删除 API Key

---

## 主题适配

### T4.1: 确保 ApiKeys.tsx 使用主题变量
- 检查所有 bg-white, bg-gray-50 等硬编码颜色
- 使用 bg-card, bg-background 等语义化颜色
