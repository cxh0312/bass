# Proposal: Webhooks 管理页面

## 背景与目标

管理员需要在 admin-ui 中管理项目的 Webhooks，包括创建、配置、测试、删除操作。

## 用户故事

1. 作为管理员，我可以在项目详情页查看该项目的所有 Webhooks
2. 我可以创建新的 Webhook（名称、URL、监听事件）
3. 我可以编辑现有 Webhook（修改 URL、事件、启用/禁用）
4. 我可以触发测试事件验证 Webhook 是否正常工作
5. 我可以删除不需要的 Webhook

## 数据模型

Webhook 结构（来自 schema.prisma）:
- `id`, `projectId`, `name`, `url`, `events[]`, `secret`, `active`, `createdAt`

API 结构（来自 `src/routes/webhooks.ts`）:
- `POST /webhooks` - 创建 Webhook（返回 secret）
- `GET /webhooks?projectId=xxx` - 列出项目的 Webhooks
- `PUT /webhooks/:id` - 更新 Webhook
- `DELETE /webhooks/:id` - 删除 Webhook
- `POST /webhooks/:id/test` - 触发测试事件

## 成功标准

1. 管理员可以在 Projects 页面点击进入项目，查看 Webhooks 列表
2. 可以创建 Webhook 并获得 secret（显示一次）
3. 可以编辑 Webhook 配置
4. 可以触发测试事件并查看结果
5. 可以删除 Webhook（有确认提示）
6. 所有操作自动适配暗黑主题

## 不做会怎样

管理员无法通过 UI 管理 Webhooks，必须通过直接调用 API。
