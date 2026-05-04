# Proposal: Leaderboard

## 背景与目标

为业务方提供排行榜功能，支持多种计分策略和高并发排名查询。

## 用户故事

1. 作为项目所有者，我可以在 Admin UI 创建和管理排行榜
2. 业务方 App 可以通过 SDK 提交分数
3. 用户可以查询自己的排名和 Top N 排名

## 数据模型

```prisma
model Leaderboard {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  projectId    String
  name        String
  description String?
  metric      String   @default("higher")  // 'higher' | 'lower'
  updateStrategy String @default("realtime") // 'realtime' | 'scheduled'
  resetSchedule String? // cron 表达式
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model LeaderboardEntry {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  leaderboardId  String
  oderId        String   // 业务方用户 ID
  score         Float
  metadata      Json?
  rank          Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([leaderboardId, oderId])
  @@index([leaderboardId, -score]) // 降序排列
}
```

## API 设计

**Admin UI（已有框架）：**
- `POST /admin/leaderboards`
- `GET /admin/leaderboards?projectId=`
- `PUT /admin/leaderboards/:id`
- `DELETE /admin/leaderboards/:id`
- `GET /admin/leaderboards/:id/entries`

**客户端 API：**
- `POST /data/leaderboards/:id/submit` - 提交分数
- `GET /data/leaderboards/:id/rank/:oderId` - 查询排名
- `GET /data/leaderboards/:id/top?n=10` - Top N
- `GET /data/leaderboards/:id/around/:oderId?range=5` - 周围用户

## 成功标准

1. Admin UI 创建和管理排行榜
2. 客户端 SDK 可提交分数
3. 支持实时排名计算
4. 支持多种 metric 策略

## 不做会怎样

业务方无法使用排行榜功能。
