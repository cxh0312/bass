# Tasks: 实时能力 + 订阅

## 后端

### T1.1: WebSocket 服务端点
- 文件: `src/ws/server.ts`（新）
- 使用 ws 或 uWebSockets.js
- 端点: `/ws?projectId=xxx&apiKey=xxx`
- JWT 鉴权

### T1.2: 订阅/退订逻辑
- 文件: `src/ws/channels.ts`（新）
- 管理 channel 订阅关系
- 支持 channel: `collection:${id}`, `leaderboard:${id}`

### T1.3: 事件发布
- 文件: `src/services/pubsub.ts`（新）
- 数据写入时发布到相关 channel
- Leaderboard 更新时发布排名变化

### T1.4: SSE 备选方案
- 文件: `src/routes/stream.ts`（新）
- `GET /api/stream/:collectionId`
- 支持 `text/event-stream`

### T1.5: 注册路由
- 文件: `src/index.ts`
- 注册 WebSocket 和 SSE 路由

---

## 客户端 SDK

### T2.1: WebSocket 客户端封装
- 文件: `src/lib/client/ws.ts`
- 自动重连逻辑
- 心跳保活

### T2.2: 订阅 API
- 文件: `src/lib/client/subscribe.ts`
- `collection.subscribe(callback)`
- `leaderboard.subscribe(callback)`

### T2.3: 集成到主 SDK
- 文件: `src/lib/client/index.ts`
- 导出订阅相关方法
