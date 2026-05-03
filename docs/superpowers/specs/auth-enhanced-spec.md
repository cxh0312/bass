# 认证增强功能设计

## 概述

为 Mango BaaS 平台补全认证相关功能：邮箱验证、密码重置、JWT 注销。

## 一、数据模型

### RefreshToken (JWT 黑名单)

```prisma
model RefreshToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  tokenId   String   @unique  // JWT 的 jti (JWT ID)
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- **用途**：JWT 注销后，将 token ID 加入黑名单，验证时查库确认
- **清理**：后台任务删除过期记录

### PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String
  token     String   @unique  // bcrypt 哈希后的 token
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

- **用途**：无状态 JWT 密码重置，15 分钟过期，一次性使用

## 二、API 设计

### 2.1 发送邮箱验证链接

```
POST /auth/send-verification
```

**请求**
```json
{
  "email": "user@example.com"
}
```

**响应 200**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Mock 实现**：生成 token，输出到控制台（生产环境替换为真实邮件发送）

### 2.2 验证邮箱

```
POST /auth/verify-email
```

**请求**
```json
{
  "token": "xxx"
}
```

**响应 200**
```json
{
  "success": true,
  "message": "Email verified"
}
```

### 2.3 请求密码重置

```
POST /auth/forgot-password
```

**请求**
```json
{
  "email": "user@example.com"
}
```

**响应 200**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Mock 实现**：生成 JWT，输出到控制台

### 2.4 重置密码

```
POST /auth/reset-password
```

**请求**
```json
{
  "token": "jwt-token",
  "newPassword": "newPassword123"
}
```

**验证**
- Token 未过期
- Token 未被使用
- Token 有效

**响应 200**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**错误 400**
```json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "Token invalid or expired"
}
```

### 2.5 注销

```
POST /auth/logout
Authorization: Bearer <jwt>
```

**响应 200**
```json
{
  "success": true,
  "message": "Logged out"
}
```

**实现**：将 JWT 的 jti 加入 RefreshToken 黑名单

## 三、用户模型变更

User 模型增加字段：

```prisma
model User {
  // ... existing fields
  emailVerified  Boolean  @default(false)
  verificationToken String?
  passwordResetToken  String?  // 当前有效的重置 token
}
```

## 四、安全设计

| 措施 | 说明 |
|------|------|
| 密码重置 Token 有效期 | 15 分钟 |
| 密码重置 Token 一次性 | 使用后标记 used |
| JWT 黑名单 | token 注销后加入黑名单 |
| 验证链接 Token | 24 小时有效期 |

## 五、实现文件

```
src/
├── auth.ts                  # 新增: token 生成/验证函数
├── routes/
│   └── auth.ts             # 新增验证/密码重置/注销路由
├── middleware/
│   └── auth.ts             # 更新: 黑名单检查
└── schemas.ts              # 新增 Zod schema
```

## 六、验证标准

- [ ] 发送邮箱验证链接生成 token 并 mock 输出
- [ ] 验证邮箱 token 能正确校验
- [ ] 请求密码重置生成 JWT 并 mock 输出
- [ ] 重置密码验证 token 有效性
- [ ] 注销将 token 加入黑名单
- [ ] 黑名单中的 token 无法通过验证