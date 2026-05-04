# Proposal: 多租户隔离 + RBAC 细化

## 背景与目标

支持更复杂的团队协作，细化权限控制。

## 用户故事

1. 作为项目所有者，我可以邀请团队成员
2. 成员有不同的角色（owner/admin/editor/viewer）
3. API Key 可以设置只读权限
4. 所有操作都有审计日志

## 数据模型

```prisma
model ProjectMember {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  projectId String
  userId    String
  role      Role     @default(viewer)  // admin/editor/viewer
  invitedBy String?
  createdAt DateTime @default(now())
}

model ApiKey {
  // 已有字段 ...
  permissions String[]  @default(["read", "write"])  // read/write/admin
}
```

## 功能设计

**团队管理：**
- 邀请成员（邮箱）
- 设置角色
- 移除成员

**API Key 权限：**
- 只读 Key（只能查询）
- 读写 Key（可写入）
- Admin Key（所有权限）

**审计日志增强：**
- 记录操作者身份
- 支持按用户筛选

## 成功标准

1. 项目成员管理 UI
2. 角色权限控制生效
3. API Key 权限级别
4. 审计日志完整

## 不做会怎样

无法支持多人协作项目，权限控制粗糙。
