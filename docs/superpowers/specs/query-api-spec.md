# 数据查询 API 设计

## 概述

增强数据查询能力，支持分页、排序、过滤、字段选择。

## 一、API 设计

### 1.1 查询数据列表

```
GET /api/:projectId/:collection
Authorization: Bearer <jwt>
```

**查询参数**

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `page` | number | 页码（默认 1） | `page=1` |
| `limit` | number | 每页数量（默认 20，最大 100） | `limit=20` |
| `sort` | string | 排序字段和方向 | `sort=-createdAt,updatedAt` |
| `filter` | string | 过滤表达式（JSON） | `filter={"status":"active"}` |
| `select` | string | 选择字段（逗号分隔） | `select=name,email` |
| `search` | string | 模糊搜索（跨字段） | `search=keyword` |

### 1.2 排序语法

- `sort=createdAt` - 按 createdAt 升序
- `sort=-createdAt` - 按 createdAt 降序（负号表示降序）
- 多字段排序：`sort=-createdAt,name`

### 1.3 过滤语法

**等值过滤**
```json
filter={"status": "active", "category": "bug"}
```

**范围过滤**
```json
filter={"age": {"$gte": 18, "$lt": 65}}
```

**支持的操作符**

| 操作符 | 说明 |
|--------|------|
| `$eq` | 等于（默认） |
| `$ne` | 不等于 |
| `$gt` | 大于 |
| `$gte` | 大于等于 |
| `$lt` | 小于 |
| `$lte` | 小于等于 |
| `$in` | 包含在数组中 |
| `$nin` | 不包含在数组中 |
| `$contains` | 字符串包含 |
| `$regex` | 正则匹配 |

**组合查询**
```json
filter={
  "$and": [
    {"status": "active"},
    {"age": {"$gte": 18}}
  ],
  "$or": [
    {"type": "A"},
    {"type": "B"}
  ]
}
```

## 二、响应格式

### 2.1 成功响应

```json
{
  "success": true,
  "data": [
    { "id": "xxx", "payload": { "name": "Task 1" } },
    { "id": "yyy", "payload": { "name": "Task 2" } }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "meta": {
    "queryTime": 12  // ms
  }
}
```

### 2.2 错误响应

```json
{
  "success": false,
  "error": "INVALID_FILTER",
  "message": "Invalid filter syntax"
}
```

## 三、实现

### 3.1 路由层

```typescript
router.get('/:projectId/:collection', zValidator('query', querySchema), async (c) => {
  const { projectId, collection } = c.req.param()
  const { page, limit, sort, filter, select, search } = c.req.valid('query')

  const result = await queryData({
    projectId,
    collection,
    options: { page, limit, sort, filter, select, search }
  })

  return c.json(result)
})
```

### 3.2 查询服务

```typescript
async function queryData(params: {
  projectId: string
  collection: string
  options: QueryOptions
}) {
  const { projectId, collection, options } = params
  const { page = 1, limit = 20, sort, filter, select, search } = options

  // 构建 MongoDB aggregate 管道
  const pipeline: any[] = [
    { $match: { projectId, collectionId: getCollectionId(projectId, collection) } }
  ]

  // 搜索
  if (search) {
    pipeline.push({
      $match: {
        $or: Object.keys(searchableFields).map(k => ({
          [`payload.${k}`]: { $regex: search, $options: 'i' }
        }))
      }
    })
  }

  // 过滤
  if (filter) {
    pipeline.push({ $match: parseFilter(filter) })
  }

  // 排序
  if (sort) {
    const sortObj = parseSort(sort)
    pipeline.push({ $sort: sortObj })
  }

  // 分页
  const skip = (page - 1) * limit
  pipeline.push({ $skip: skip }, { $limit: limit })

  // 字段选择
  if (select) {
    pipeline.push({
      $project: {
        id: 1,
        payload: 1,
        createdAt: 1,
        updatedAt: 1,
        ...parseSelect(select)
      }
    })
  }

  const [data, countResult] = await Promise.all([
    db.data.aggregate(pipeline),
    db.data.countDocuments({ projectId, collectionId })
  ])

  return {
    data,
    pagination: {
      page,
      limit,
      total: countResult,
      totalPages: Math.ceil(countResult / limit)
    }
  }
}
```

## 四、Zod Schema

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  filter: z.string().optional(), // JSON string
  select: z.string().optional(),
  search: z.string().optional()
})
```

## 五、实现文件

```
src/
├── services/
│   └── query.ts         # 新增 查询服务
├── routes/
│   └── data.ts          # 更新 增强查询 API
└── schemas.ts           # 更新 query schema
```

## 六、验证标准

- [ ] 分页正确（page/limit/totalPages）
- [ ] 排序正确（升序/降序）
- [ ] 过滤正确（等值/范围/组合）
- [ ] 字段选择正确
- [ ] 搜索正确
- [ ] 响应包含 queryTime