# Tasks: 客户端 SDK

## SDK 包

### T1.1: 创建 SDK 包结构
- 目录: `packages/sdk/` 或 `src/lib/client/`
- package.json 配置
- TypeScript 配置

### T1.2: 实现 Mango 客户端类
- 文件: `Mango.ts`
- 功能:
  - 初始化配置
  - 底层请求封装
  - 错误处理

### T1.3: 实现 Collection 封装
- 文件: `Collection.ts`
- 方法: create, findMany, findOne, update, delete

### T1.4: 实现 Leaderboard 封装
- 文件: `Leaderboard.ts`
- 方法: submit, getTop, getRank, getAround

### T1.5: 类型定义
- 文件: `types.ts`
- 完整 TypeScript 类型

---

## 文档

### T2.1: README
- 安装说明
- 快速开始示例
- API 文档链接

### T2.2: 示例代码
- 基本 CRUD 示例
- Leaderboard 示例

---

## 发布（可选）

### T3.1: 发布到 npm（后续）
- 配置 package.json
- 发布脚本
