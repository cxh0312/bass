# Proposal: 实时能力 + 订阅

## 背景与目标

从纯 REST API 扩展到实时能力，支持 WebSocket 推送。

## 用户故事

1. 业务方可以订阅 Collection 数据变更
2. 排行榜支持实时排名推送
3. 连接断开后自动重连

## 数据模型

无新增数据模型（复用现有 Webhook 机制）。

## 功能设计

**WebSocket 通道：**
```
// 服务端
ws://api.mango.baas/ws?projectId=xxx&apiKey=xxx

// 订阅消息
{ type: 'subscribe', channel: 'collection:users' }
{ type: 'subscribe', channel: 'leaderboard:weekly' }

// 推送消息
{ type: 'insert', channel: 'collection:users', data: {...} }
{ type: 'rank_update', channel: 'leaderboard:weekly', oderId: 'xxx', rank: 5 }
```

**SSE 备选：**
- 对于简单场景可用 Server-Sent Events
- `GET /api/stream/:collectionId`

**SDK 支持：**
```typescript
mango.collection('users').subscribe(event => {
  console.log('新用户:', event.data)
})
```

## 成功标准

1. WebSocket 服务端点
2. 客户端 SDK 订阅支持
3. 自动重连机制
4. Leaderboard 实时推送

## 不做会怎样

游戏、聊天等实时应用无法使用。
