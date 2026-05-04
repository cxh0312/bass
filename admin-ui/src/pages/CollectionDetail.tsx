import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getCollection, getCollectionData, type Collection, type CollectionData } from '@/lib/api'

export function CollectionDetail() {
  const params = useParams()
  const navigate = useNavigate()
  const collectionId = params.collectionId

  const [collection, setCollection] = useState<Collection | null>(null)
  const [data, setData] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [selectedData, setSelectedData] = useState<CollectionData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    if (collectionId) {
      loadCollection(collectionId)
    }
  }, [collectionId])

  useEffect(() => {
    if (collectionId) {
      loadData(collectionId, page)
    }
  }, [page, collectionId])

  const loadCollection = async (id: string) => {
    setLoading(true)
    try {
      // First get all collections and find the one we need
      const res = await getCollection(id)
      if (res.code === 0) {
        setCollection(res.data)
      }
    } catch (err) {
      console.error('Failed to load collection:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async (collectionId: string, page: number) => {
    setDataLoading(true)
    try {
      const res = await getCollectionData(collectionId, page, limit)
      if (res.code === 0) {
        setData(res.data)
        setTotal(res.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const handleViewDetail = (item: CollectionData) => {
    setSelectedData(item)
    setDetailOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Collection 不存在</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          <p className="text-sm text-muted-foreground">
            {collection.strict ? '严格模式' : '灵活模式'}
          </p>
        </div>
      </div>

      {/* Collection Info */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-3">Collection 信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ID:</span>
            <span className="ml-2 font-mono">{collection.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Project ID:</span>
            <span className="ml-2 font-mono">{collection.projectId}</span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间:</span>
            <span className="ml-2">{new Date(collection.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">数据校验:</span>
            <span className="ml-2">{collection.strict ? '严格' : '灵活'}</span>
          </div>
        </div>
        {collection.schema && (
          <div className="mt-3">
            <span className="text-muted-foreground text-sm">Schema:</span>
            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
              {JSON.stringify(collection.schema, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">数据记录</h2>
          <span className="text-sm text-muted-foreground">
            共 {total} 条记录
          </span>
        </div>

        {dataLoading ? (
          <p className="text-center py-8 text-muted-foreground">加载数据...</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Payload 预览</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-mono text-xs max-w-md truncate">
                        {JSON.stringify(item.payload)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetail(item)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>数据详情</DialogTitle>
          </DialogHeader>
          {selectedData && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">ID:</span>
                <span className="ml-2 font-mono">{selectedData.id}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Collection ID:</span>
                <span className="ml-2 font-mono">{selectedData.collectionId}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">创建时间:</span>
                <span className="ml-2">{new Date(selectedData.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">更新时间:</span>
                <span className="ml-2">{selectedData.updatedAt ? new Date(selectedData.updatedAt).toLocaleString() : '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Payload:</span>
                <pre className="mt-1 p-3 bg-background rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedData.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}