# Proposal: Audit Logs UI

## 背景与目标

为管理员提供审计日志查看界面，记录所有敏感操作的详细日志。

## 用户故事

1. 作为管理员，我希望查看所有操作的审计日志
2. 我希望按用户、操作类型、时间范围筛选
3. 我希望查看单个操作的详细信息

## 数据模型

已有 `AuditLog` 模型：
```prisma
model AuditLog {
  id, userId, action, resource, resourceId,
  details: Json, ip, userAgent, createdAt
}
```

## API 设计

已有 `GET /admin/audit-logs` API，支持分页和筛选。

## 功能设计

**列表页面：**
- 表格展示：时间、用户、操作类型、资源、操作详情
- 筛选器：用户、操作类型、时间范围
- 分页

**详情弹窗：**
- 点击行查看完整日志详情
- 显示 IP、User-Agent 等信息

## 成功标准

1. 审计日志列表页展示所有记录
2. 支持按用户/操作类型/时间筛选
3. 点击查看详情

## 不做会怎样

无法直观追踪用户操作，安全审计困难。
