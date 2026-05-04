# 管理后台实施任务

## 前置条件

- [x] proposal.md 产出
- [x] design.md 产出
- [x] plan-eng-review 通过

---

## 目录结构

```
mango-baas/
├── admin-ui/                    # 新增：React 前端（独立项目）
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui 组件
│   │   │   ├── layout/         # Layout 组件
│   │   │   └── data-view/      # 数据表格组件
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── Collections.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── src/routes/admin.ts         # 扩展现有 Admin API
└── src/middleware/auth.ts       # 复用现有中间件
```

---

## Tasks

### Phase 1: 项目初始化

- [ ] **T1.1**: 初始化 `admin-ui/` 目录
  ```bash
  cd /Users/caoxiaohe/Github/bass/mango-baas
  npm create vite@latest admin-ui -- --template react-ts
  cd admin-ui && npm install
  ```

- [ ] **T1.2**: 安装依赖
  ```bash
  npm install @tanstack/react-table lucide-react tailwindcss postcss autoprefixer
  npx shadcn@latest init
  npx shadcn@latest add button input label select table card dialog alert
  ```

- [ ] **T1.3**: 配置 Tailwind CSS（参考 shadcn/ui 文档）

---

### Phase 2: 后端 API 扩展

- [ ] **T2.1**: 扩展 `src/routes/admin.ts` — 新增 Project CRUD API
  - `GET /admin/projects` — 列表（分页）
  - `GET /admin/projects/:id` — 详情
  - `POST /admin/projects` — 创建
  - `PUT /admin/projects/:id` — 更新
  - `DELETE /admin/projects/:id` — 删除

- [ ] **T2.2**: 扩展 `src/routes/admin.ts` — 新增 Collection 浏览 API
  - `GET /admin/collections` — 列表
  - `GET /admin/collections/:id/data` — 数据列表（分页）

- [ ] **T2.3**: 扩展 `src/middleware/auth.ts` — 新增 admin role 检查中间件 `adminAuthMiddleware`
  - 复用现有 JWT 验证
  - 检查 `payload.role === 'admin'`

- [ ] **T2.4**: 新增登录 API
  - `POST /admin/auth/login` — 用户名密码登录，返回 JWT

---

### Phase 3: 前端组件

- [ ] **T3.1**: 创建 `admin-ui/src/lib/api.ts` — API 调用封装
  - Base URL 配置
  - Authorization Header 自动携带
  - 错误处理

- [ ] **T3.2**: 创建布局组件 `admin-ui/src/components/layout/`
  - Sidebar 导航
  - Header（用户信息、登出）
  - 响应式布局

- [ ] **T3.3**: 创建登录页面 `admin-ui/src/pages/Login.tsx`

- [ ] **T3.4**: 创建用户管理页面 `admin-ui/src/pages/Users.tsx`
  - 表格展示用户列表
  - 新建/编辑用户 Dialog
  - 删除确认

- [ ] **T3.5**: 创建项目管理页面 `admin-ui/src/pages/Projects.tsx`
  - 表格展示项目列表
  - 新建/编辑项目 Dialog

- [ ] **T3.6**: 创建集合数据浏览页面 `admin-ui/src/pages/Collections.tsx`
  - 左侧项目树
  - 右侧数据表格

---

### Phase 4: 测试

- [ ] **T4.1**: 编写 Vitest 测试覆盖 admin API routes
  - `tests/routes/admin.test.ts` — 覆盖 Project/Collection CRUD
  - 覆盖 JWT 验证和 admin 中间件

- [ ] **T4.2**: 验证前端构建成功
  ```bash
  cd admin-ui && npm run build
  ```

---

## 验收标准

1. ✅ `admin-ui/` 可独立运行 `npm run dev`
2. ✅ 登录页可正常登录（用户名密码 → JWT）
3. ✅ 用户管理：列表、新建、编辑、删除
4. ✅ 项目管理：列表、新建、编辑、删除
5. ✅ 集合数据：可浏览（只读）
6. ✅ 所有 API 有 Vitest 测试覆盖
7. ✅ 前端构建产物可部署

---

## 技术约束

- React: 19.x
- Vite: 最新版本
- 认证: Authorization Header（不用 Cookie）
- UI: shadcn/ui + Tailwind CSS
- 表格: TanStack Table