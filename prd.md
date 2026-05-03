自建 BaaS 平台整体设计方案
项目代号：Mango BaaS（芒果后端即服务）
版本：v1.0
日期：2025年5月

一、项目定位
构建一个轻量级、可自托管、团队友好的后端即服务平台，为内部项目提供统一的用户认证、数据存储和业务API能力，同时为运营/策划同学提供可视化管理工具。

核心目标
目标	描述
统一后端基座	所有内部项目共享认证、数据库、文件存储能力
降低开发门槛	前端同学直接调 API，无需理解后端细节
赋能非技术团队	运营/策划可通过可视化面板管理数据、配置活动
数据自主可控	所有数据在自建 MongoDB 中，不依赖第三方 BaaS 平台
灵活可扩展	核心逻辑可控，未来可替换任意组件
二、总体架构
text
┌──────────────────────────────────────────────────┐
│                   客户端层                         │
│   Web应用   │   移动App   │   第三方服务            │
└──────────────┬───────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  Nginx / Ingress │    负载均衡 + HTTPS
       └───────┬────────┘
               │
    ┌──────────┼──────────────┐
    │          │              │
┌───▼────┐ ┌───▼────┐  ┌─────▼──────┐
│Budibase│ │  Hono  │  │  静态资源   │
│管理面板│ │ API服务 │  │  (CDN)     │
└───┬────┘ └───┬────┘  └────────────┘
    │          │
    │   ┌──────▼───────┐
    └───►   Prisma     │    统一数据访问层
        └──────┬───────┘
               │
        ┌──────▼───────┐
        │   MongoDB    │    数据持久化
        │  (副本集)     │
        └──────────────┘
设计原则
分层解耦：每层职责清晰，可独立替换

数据为核：MongoDB 是唯一数据源，所有服务直连

类型安全：从 API 到数据库全链路 TypeScript + Zod + Prisma

自托管优先：所有组件部署在自己的基础设施上

三、技术选型方案
层次	技术	版本	选型理由
运行环境	Node.js	20+ LTS	生态丰富，全栈 TypeScript
Web 框架	Hono	4.x	超轻量、高性能、支持多运行时
数据校验	Zod	3.x	TypeScript 原生类型推导，Hono 无缝集成
数据库 ORM	Prisma	5.x	类型安全、自动迁移、完美支持 MongoDB
数据库	MongoDB	7.x	文档型、灵活 Schema、与 Prisma 匹配度高
认证	JWT (jsonwebtoken)	-	无状态、轻量、适合 BaaS
加密	bcryptjs	-	密码哈希，安全可靠
管理面板	Budibase	latest	开源、低代码、原生支持 MongoDB
部署(可选)	Docker / K8s	-	容器化、可弹性扩展
反向代理(可选)	Nginx / Caddy	-	HTTPS、负载均衡
四、模块设计
4.1 核心模块清单
模块	说明	优先级
用户系统	注册、登录、JWT 签发与验证	P0（已完成设计）
数据 CRUD API	通用集合的增删改查，按用户隔离	P0（已完成设计）
输入校验	Zod Schema 统一校验所有入参	P0（已完成设计）
权限系统(RBAC)	角色管理、接口权限控制	P1
文件存储	头像、图片、附件上传	P1
API Key 管理	为第三方服务提供 API Key 认证	P1
数据看板	在 Budibase 中展示统计指标	P2
实时通知	WebSocket 推送数据变更	P2
操作审计	记录关键操作日志	P2
4.2 数据模型
text
User {
  id: ObjectId
  email: string (unique)
  password: string (hashed)
  name: string?
  role: "admin" | "editor" | "viewer"
  createdAt: DateTime
  updatedAt: DateTime
}

Project {
  id: ObjectId
  name: string
  description: string?
  ownerId: ObjectId (→ User)
  apiKey: string
  createdAt: DateTime
}

Collection {
  id: ObjectId
  projectId: ObjectId (→ Project)
  name: string
  schema: JSON (Zod schema 定义)
  permissions: JSON (权限规则)
  createdAt: DateTime
}
五、API 设计
5.1 认证接口
方法	路径	说明	认证
POST	/auth/register	注册新用户	无
POST	/auth/login	登录获取 JWT	无
POST	/auth/refresh	刷新令牌	JWT
GET	/auth/me	获取当前用户信息	JWT
5.2 数据操作接口
方法	路径	说明	认证
GET	/api/:projectId/:collection	查询数据列表	JWT
POST	/api/:projectId/:collection	创建数据	JWT
GET	/api/:projectId/:collection/:id	获取单条数据	JWT
PUT	/api/:projectId/:collection/:id	更新数据	JWT
DELETE	/api/:projectId/:collection/:id	删除数据	JWT
5.3 管理接口
方法	路径	说明	认证 + 角色
GET	/admin/users	用户列表	admin
PUT	/admin/users/:id/role	修改用户角色	admin
GET	/admin/stats	系统统计	admin
六、项目目录结构
text
mango-baas/
├── src/
│   ├── index.ts              # 主入口，Hono 应用组装
│   ├── db.ts                 # Prisma Client 单例
│   ├── auth.ts               # 注册、登录、JWT 工具函数
│   ├── schemas.ts            # Zod 校验 Schema 集中定义
│   ├── routes/
│   │   ├── auth.ts           # 认证路由
│   │   ├── data.ts           # 数据 CRUD 路由
│   │   └── admin.ts          # 管理路由
│   └── middleware/
│       ├── auth.ts           # JWT 鉴权中间件
│       └── rbac.ts           # 角色权限中间件
├── prisma/
│   └── schema.prisma         # 数据模型定义
├── tests/                    # 测试用例
├── .env                      # 环境变量
├── package.json
├── tsconfig.json
└── README.md
七、部署方案
方案 A：Docker 单机部署（推荐起步）
text
┌─────────────────────────────────────┐
│              云服务器 / VPS          │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Budibase │  │   Hono   │        │
│  │  :10000  │  │  :3000   │        │
│  └──────────┘  └──────────┘        │
│         │            │              │
│         └─────┬──────┘              │
│               │                     │
│       ┌───────▼───────┐             │
│       │   MongoDB     │             │
│       │   :27017      │             │
│       └───────────────┘             │
│                                     │
│   反向代理: Caddy/Nginx 统一 443     │
└─────────────────────────────────────┘
快速启动命令：

bash
# Hono API
docker run -d -p 3000:3000 \
  --env-file .env \
  your/mango-baas:latest

# Budibase
docker run -d -p 10000:80 \
  -e DATABASE_TYPE=mongodb \
  -e MONGODB_URI=mongodb://mongo:27017/budibase_metadata \
  budibase/budibase:latest
方案 B：K8s 部署（生产推荐）
所有服务独立 Deployment + Service，MongoDB 使用 StatefulSet 或外部云数据库。

八、安全设计
层面	措施
传输安全	HTTPS 全链路
认证安全	JWT 7天过期、密码 bcrypt 10轮哈希
输入安全	Zod 严格校验，防止 NoSQL 注入
权限安全	用户数据隔离、角色控制
运维安全	环境变量管理密钥、定期备份 MongoDB
九、可替换性设计
如果未来某个组件需要升级或替换：

被替换组件	替换方案	影响范围
Hono → Express/Fastify	更换路由层	仅路由文件
Prisma → Mongoose	更换 ORM	仅数据访问层
MongoDB → PostgreSQL	更换数据库	Prisma 切换数据源
Budibase → Appsmith	更换管理面板	无后端改动
JWT → OAuth2	更换认证方案	仅 auth 模块
十、推荐实施路线图
text
第 1 周：搭建核心
├── ✅ 初始化 Hono + Prisma + Zod 项目
├── ✅ 实现注册/登录/JWT
├── ✅ 实现 Tasks CRUD 示例
└── ✅ 部署 Budibase 连接 MongoDB

第 2 周：完善功能
├── 用户角色与权限
├── 文件上传模块
└── 通用集合 API

第 3 周：生产化
├── 单元测试
├── Docker 镜像构建
├── CI/CD 流水线
└── 备份策略

第 4 周：团队赋能
├── Budibase 搭建运营后台
├── API 文档编写
└── 团队培训
这是完整的设计和技术方案.


