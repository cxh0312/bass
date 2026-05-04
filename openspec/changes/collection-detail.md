# Proposal: Collection 详情页

## 背景与目标

管理员需要在 admin-ui 中查看 Collection 内的数据记录，进行基本的浏览和管理操作。

## 用户故事

1. 作为管理员，我可以在 Projects 页面点击进入项目，查看项目的所有 Collections
2. 我可以点击 Collection 查看该 Collection 内的所有数据记录
3. 我可以分页浏览数据记录
4. 我可以查看单条记录的详细信息（JSON 格式）

## 数据模型

Collection 结构（来自 schema.prisma）:
- `id`, `projectId`, `name`, `schema`, `strict`, `permissions`, `createdAt`

Data 结构（来自 schema.prisma）:
- `id`, `collectionId`, `projectId`, `payload`, `createdAt`, `updatedAt`

API 结构（来自 `src/routes/data.ts`）:
- `GET /data/:collectionId` - 获取 Collection 内的数据列表（分页）
- `GET /data/:collectionId/:id` - 获取单条记录详情

## 成功标准

1. 管理员可以在 Projects 详情页看到该项目的所有 Collections 列表
2. 点击 Collection 进入详情页，可以看到该 Collection 内的数据记录列表
3. 支持分页展示
4. 点击记录可以查看完整的 JSON payload
5. 所有操作自动适配暗黑主题

## 不做会怎样

管理员无法通过 UI 查看 Collection 内的数据，只能通过 API 调用。
