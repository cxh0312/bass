# Tasks: 多租户隔离 + RBAC 细化

## 数据库

### T1.1: 添加 ProjectMember 扩展字段
- 文件: `prisma/schema.prisma`
- 添加 `invitedBy`, `email` 等字段

### T1.2: 添加 ApiKey 权限字段
- 文件: `prisma/schema.prisma`
- 添加 `permissions` 字段

### T1.3: 运行 migrate
- 命令: `bunx prisma db push`

---

## 后端

### T2.1: 成员管理 API
- 文件: `src/routes/members.ts`（新）
- `POST /admin/projects/:id/members` - 邀请成员
- `GET /admin/projects/:id/members` - 成员列表
- `PUT /admin/projects/:id/members/:memberId` - 更新角色
- `DELETE /admin/projects/:id/members/:memberId` - 移除成员

### T2.2: API Key 权限验证
- 文件: `src/middleware/auth.ts`
- 改造 authMiddleware 支持权限检查

### T2.3: 数据层权限控制
- 文件: `src/routes/data.ts`
- 根据 API Key 权限决定是否允许写入

---

## Admin UI

### T3.1: 项目成员管理页面
- 文件: `admin-ui/src/pages/ProjectMembers.tsx`
- 成员列表 Table
- 邀请成员表单
- 角色编辑

### T3.2: API Key 权限配置
- 文件: `admin-ui/src/pages/ApiKeys.tsx`
- 创建/编辑 API Key 时可选择权限

### T3.3: 路由
- 文件: `admin-ui/src/App.tsx`
- 添加 `/projects/:projectId/members`

### T3.4: Projects 页面入口
- 文件: `admin-ui/src/pages/Projects.tsx`
- 添加成员管理按钮（Users 图标）
