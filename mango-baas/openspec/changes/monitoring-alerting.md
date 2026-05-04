# Proposal: 监控告警体系

## 背景与目标

让系统可观测，运营团队能看到用量、慢查询、异常告警。

## 用户故事

1. 管理员可以看到系统全局用量 Dashboard
2. 项目所有者可以看到自己项目的用量
3. API 响应慢的查询有日志
4. 异常情况发送告警

## 数据模型

```prisma
model ApiMetrics {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  projectId  String
  endpoint   String
  method     String
  statusCode Int
  durationMs Int
  timestamp  DateTime @default(now())

  @@index([projectId, timestamp])
}
```

## 功能设计

**Dashboard 增强：**
- API 调用量趋势
- 平均响应时间趋势
- 错误率趋势
- 慢查询列表（>1s）

**项目级用量：**
- 每日/每周/每月 API 调用量
- Top Endpoints
- 配额提醒（达到 80% 告警）

**告警规则：**
- 错误率超过阈值
- 响应时间超过阈值
- 配额使用超过 80%
- 通知方式：Webhook/邮件

## 成功标准

1. 系统级 Dashboard 展示全局指标
2. 项目级用量统计页面
3. 慢查询日志记录
4. 告警规则配置 UI

## 不做会怎样

系统黑盒运行，问题难以追踪。
