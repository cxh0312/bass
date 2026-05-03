# Mango BaaS 功能设计规范索引

本文档索引所有功能设计 spec。

## 核心模块 (已更新)

| 文档 | 说明 |
|------|------|
| `../prd.md` | 整体设计方案（基础部分） |

## 新增功能 Spec

| 文档 | 说明 |
|------|------|
| `auth-enhanced-spec.md` | 认证增强（邮箱验证、密码重置、JWT 注销） |
| `api-key-spec.md` | API Key 管理 |
| `webhook-spec.md` | Webhook 系统（签名验证、重试机制） |
| `rate-limit-spec.md` | 滑动窗口限流 |
| `audit-log-spec.md` | 审计日志 |
| `query-api-spec.md` | 分页/排序/过滤/搜索 |

## 数据模型变更汇总

```prisma
// 新增模型
model RefreshToken { ... }
model PasswordResetToken { ... }
model ApiKey { ... }
model Webhook { ... }
model WebhookDelivery { ... }
model AuditLog { ... }
model RateLimitRecord { ... }

// User 模型变更
emailVerified: Boolean @default(false)
verificationToken: String?
passwordResetToken: String?
```

## 实现顺序建议

1. **auth-enhanced-spec.md** - 认证是基础
2. **api-key-spec.md** - 第三方认证依赖认证
3. **rate-limit-spec.md** - 限流是基础设施
4. **audit-log-spec.md** - 审计依赖限流
5. **webhook-spec.md** - Webhook 依赖审计
6. **query-api-spec.md** - 查询增强独立实现