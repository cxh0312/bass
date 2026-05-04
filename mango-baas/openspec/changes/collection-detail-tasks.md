# Tasks: Collection 详情页

## Collection 详情页

### T1.1: 创建 `CollectionDetail.tsx` 页面组件
- 文件: `admin-ui/src/pages/CollectionDetail.tsx`
- 功能:
  - 显示 Collection 基本信息（名称、schema）
  - 列出 Collection 内的所有数据记录（分页）
  - 点击记录查看完整 JSON payload
  - 分页导航

### T1.2: 添加 Collection 详情页路由
- 文件: `admin-ui/src/App.tsx` 或路由配置文件
- 路由: `/projects/:projectId/collections/:collectionId`

### T1.3: 在 Projects 详情页添加 Collections 列表
- 文件: `admin-ui/src/pages/Projects.tsx`
- 显示 Collections Tab/列表，点击进入详情

---

## Collection 详情后端（如需要）

### T2.1: 添加 Collection 数据查询 API
- 文件: `src/routes/data.ts`
- 修改 GET `/data/:collectionId` 支持 projectId 鉴权
- 添加 GET `/data/:collectionId/:id` 获取单条记录

---

## 测试

### T3.1: Collection 详情页单元测试
- 文件: `tests/pages/collection-detail.test.tsx`
- 测试场景:
  - 渲染 Collection 信息
  - 渲染数据列表
  - 分页导航
  - 查看单条记录详情

---

## 主题适配

### T4.1: 确保 CollectionDetail.tsx 使用主题变量
- 检查所有 bg-white, bg-gray-50 等硬编码颜色
- 使用 bg-card, bg-background 等语义化颜色
