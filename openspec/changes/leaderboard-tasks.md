# Tasks: Leaderboard

## 数据库

### T1.1: 添加 Leaderboard 模型
- 文件: `prisma/schema.prisma`
- 添加 `Leaderboard` 和 `LeaderboardEntry` models

### T1.2: 运行 migrate
- 命令: `bunx prisma db push`

---

## 后端

### T2.1: 创建 leaderboards 路由
- 文件: `src/routes/leaderboards.ts`
- Admin API:
  - `POST /admin/leaderboards` - 创建
  - `GET /admin/leaderboards?projectId=` - 列表
  - `PUT /admin/leaderboards/:id` - 更新
  - `DELETE /admin/leaderboards/:id` - 删除
  - `GET /admin/leaderboards/:id/entries` - 所有提交

### T2.2: 客户端 API 路由
- 文件: `src/routes/data.ts` 或新文件
- 添加:
  - `POST /data/leaderboards/:id/submit` - 提交分数
  - `GET /data/leaderboards/:id/rank/:oderId` - 查询排名
  - `GET /data/leaderboards/:id/top` - Top N
  - `GET /data/leaderboards/:id/around/:oderId` - 周围用户

### T2.3: 注册路由
- 文件: `src/index.ts`
- 注册 leaderboards 路由

---

## Admin UI

### T3.1: 创建 Leaderboards 页面
- 文件: `admin-ui/src/pages/Leaderboards.tsx`
- 功能:
  - 排行榜列表 Table
  - 创建/编辑对话框
  - 删除确认

### T3.2: 创建 LeaderboardDetail 页面
- 文件: `admin-ui/src/pages/LeaderboardDetail.tsx`
- 功能:
  - 排行榜配置信息
  - 参赛者列表 Table
  - Top N 预览

### T3.3: 添加路由
- 文件: `admin-ui/src/App.tsx`
- 路由:
  - `/projects/:projectId/leaderboards`
  - `/projects/:projectId/leaderboards/:id`

### T3.4: API 函数
- 文件: `admin-ui/src/lib/api.ts`
- 添加 leaderboard 相关函数

### T3.5: 更新 Projects 页面
- 文件: `admin-ui/src/pages/Projects.tsx`
- 添加 Leaderboards 入口按钮

---

## 客户端 SDK（可选，后续）

### T4.1: 客户端 API 封装
- 文件: `src/lib/client-sdk.ts`
- 封装 leaderboard 相关 API 供业务方使用

---

## 测试

### T5.1: Leaderboard 测试
- 文件: `tests/routes/leaderboard.test.ts`
- 测试场景:
  - 创建排行榜
  - 提交分数
  - 排名查询
  - Top N 查询

---

## 主题适配

### T6.1: 确保使用主题变量
- 检查 bg-white, bg-gray-50 等
- 使用 bg-card, bg-background
