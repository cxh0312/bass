# Tasks: 增强 Webhook 系统

## 数据库

### T1.1: 确认 WebhookDelivery 模型
- 检查 schema.prisma 是否已有
- 如没有，添加模型

---

## 后端

### T2.1: 增强 Webhook 投递记录
- 文件: `src/routes/webhooks.ts`
- 每次投递后创建 WebhookDelivery 记录
- 记录响应状态码、响应体

### T2.2: Webhook 重试 API
- 文件: `src/routes/webhooks.ts`
- `POST /webhooks/:id/retry` - 重新发送上一个失败的事件

### T2.3: 失败告警逻辑
- 文件: `src/services/webhook.ts`
- 连续失败 N 次后触发告警（发邮件或 webhook）

### T2.4: 签名验证 SDK 函数
- 文件: `src/lib/webhook-verify.ts`
- 导出 verify 函数供业务方使用

---

## Admin UI

### T3.1: Webhook 投递记录页面
- 文件: `admin-ui/src/pages/WebhookDeliveries.tsx`
- 列表展示：时间、事件、状态、重试按钮
- 详情弹窗：查看完整请求/响应

### T3.2: 告警配置
- 文件: `admin-ui/src/pages/Webhooks.tsx`
- 添加"设置告警"按钮
- 配置告警阈值

### T3.3: 路由
- 文件: `admin-ui/src/App.tsx`
- 添加 `/projects/:projectId/webhooks/:id/deliveries`

---

## 客户端 SDK

### T4.1: 签名验证函数
- 文件: `src/lib/client/webhook-verify.ts`
- 封装到 SDK 中
