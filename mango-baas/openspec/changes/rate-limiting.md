# Proposal: 速率限制

## 背景与目标

保护 Mango BaaS API 免受滥用和恶意攻击，通过配置速率限制规则来控制每个项目/用户的 API 调用频率。

## 用户故事

1. 作为系统管理员，我希望配置全局默认速率限制
2. 作为项目所有者，我希望为自己的项目配置独立的速率限制
3. 作为业务方，当请求超限时收到明确的 429 错误提示

## 数据模型

```prisma
model RateLimitRule {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  name       String   // 规则名称
  identifier String   // 标识符类型: 'global' | 'project' | 'apikey' | 'user'
  key        String?  // 当 identifier 为特定类型时的 key
  limit      Int      // 限制次数
  windowSec  Int      // 时间窗口（秒）
  projectId  String?  // 项目ID（可选，用于项目级限制）
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())
}
```

## API 设计

**管理端：**
- `GET /admin/rate-limits` - 列表
- `POST /admin/rate-limits` - 创建规则
- `PUT /admin/rate-limits/:id` - 更新规则
- `DELETE /admin/rate-limits/:id` - 删除规则

**中间件：**
- 速率限制中间件应用于所有 API 路由
- 根据 identifier 类型匹配规则
- 返回 429 状态码 + `Retry-After` 头

## 成功标准

1. 系统有默认全局速率限制
2. 可以配置项目级/用户级/API Key 级限制
3. 超限时返回 429 + 重试时间
4. 速率限制记录到日志

## 不做会怎样

API 容易被滥用，导致服务不稳定。
