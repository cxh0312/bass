# Proposal: 增强 Webhook 系统

## 背景与目标

让 Webhook 更可靠，支持投递记录查看、手动重试、告警通知。

## 用户故事

1. 作为项目所有者，我可以查看 Webhook 投递历史
2. 我可以手动触发重试失败的投递
3. Webhook 失败时收到通知
4. 我可以为 Webhook 设置签名密钥验证

## 数据模型

已有 `WebhookDelivery` 模型。

## 功能设计

**投递记录 UI：**
- 列表展示：时间、事件类型、状态码、是否成功
- 失败详情：响应体、错误原因
- 手动重试按钮

**告警通知：**
- Webhook 连续失败 N 次后发送通知
- 通知方式：邮件/Webhook（可选）

**签名验证：**
- SDK 提供签名验证函数
- `mango.webhook.verify(payload, signature, secret)`

## 成功标准

1. Admin UI 查看 Webhook 投递记录
2. 支持手动重试
3. 失败告警配置
4. 客户端 SDK 签名验证

## 不做会怎样

Webhook 出问题时无法追踪和恢复。
