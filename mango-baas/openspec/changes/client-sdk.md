# Proposal: 客户端 SDK + 文档完善

## 背景与目标

降低业务方接入 Mango BaaS 的成本，提供开箱即用的 TypeScript/JS SDK。

## 用户故事

1. 业务方可以通过 npm 安装 SDK
2. 初始化后可以方便地操作 Collection 数据
3. 可以使用 Leaderboard 等高级功能
4. 有完整的文档和示例代码快速上手

## 数据模型

无新增数据模型。

## SDK 设计

```typescript
// 安装：npm install @mango-baas/sdk

import { Mango } from '@mango-baas/sdk'

const mango = new Mango({
  projectId: 'xxx',
  apiKey: 'mba_sk_xxx'
})

// Collection 操作
mango.collection('users').create({ name: 'John' })
mango.collection('users').findMany({ limit: 10 })
mango.collection('users').findOne(id)

// Leaderboard
mango.leaderboard.submit('weekly', oderId, score)
mango.leaderboard.getTop('weekly', 10)
mango.leaderboard.getRank('weekly', oderId)
```

## 成功标准

1. SDK npm 包发布
2. 支持 Collection CRUD
3. 支持 Leaderboard 提交和查询
4. 完整 TypeScript 类型支持
5. 有 README 和示例代码

## 不做会怎样

业务方需要自己封装 API 调用，接入成本高。
