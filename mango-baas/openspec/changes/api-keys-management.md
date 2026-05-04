# Proposal: API Keys 管理页面

## 背景与目标

管理员需要在 admin-ui 中管理项目的 API Keys，包括创建、查看、删除操作。

## 用户故事

1. 作为管理员，我可以在项目详情页查看该项目的所有 API Keys
2. 我可以创建新的 API Key（名称 + 项目关联）
3. 我可以删除不再需要的 API Key
4. 创建时显示完整的 key（仅一次，之后不再明文显示）

## 数据模型

API Key 结构（来自 schema.prisma）:
- `id`, `name`, `keyPrefix`, `lastUsed`, `createdAt`
- `userId`, `projectId`

API 结构（来自 `src/routes/api-keys.ts`）:
- `POST /api/keys` - 创建 API Key（返回原始 key）
- `GET /api/keys?projectId=xxx` - 列出项目的 API Keys
- `DELETE /api/keys/:id` - 删除 API Key

## 成功标准

1. 管理员可以在 Projects 页面点击进入项目，查看 API Keys 列表
2. 可以创建带名称的 API Key，并显示原始 key（一次性）
3. 可以删除 API Key（有确认提示）
4. 所有操作自动适配暗黑主题

## 不做会怎样

管理员无法通过 UI 管理 API Keys，必须通过直接调用 API。
