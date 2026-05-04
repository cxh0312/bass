import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getWebhookDeliveries, retryDelivery, type WebhookDelivery } from '@/lib/api'

export function WebhookDeliveries() {
  const { webhookId } = useParams()
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<WebhookDelivery | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const limit = 20

  useEffect(() => {
    if (webhookId) loadDeliveries()
  }, [webhookId, page])

  const loadDeliveries = async () => {
    setLoading(true)
    try {
      const res = await getWebhookDeliveries(webhookId!, page, limit)
      if (res.success) {
        setDeliveries(res.data)
        setTotal(res.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load deliveries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (id: string) => {
    try {
      await retryDelivery(id)
      loadDeliveries()
    } catch (err) {
      console.error('Retry failed:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold">投递记录</h1>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>事件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>状态码</TableHead>
              <TableHead>尝试次数</TableHead>
              <TableHead>时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无投递记录</TableCell></TableRow>
            ) : (
              deliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{d.event}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${d.success ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                      {d.success ? '成功' : '失败'}
                    </span>
                  </TableCell>
                  <TableCell>{d.statusCode || '-'}</TableCell>
                  <TableCell>{d.attempt}</TableCell>
                  <TableCell className="text-sm">{new Date(d.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setSelected(d); setDetailOpen(true) }}>详情</Button>
                      {!d.success && <Button size="sm" variant="ghost" onClick={() => handleRetry(d.id)}><RefreshCw className="w-3 h-3" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {total > limit && (
          <div className="flex justify-center gap-2 p-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <span className="flex items-center text-sm text-muted-foreground">第 {page} / {Math.ceil(total / limit)} 页</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>投递详情</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">事件:</span> {selected.event}</div>
              <div><span className="text-muted-foreground">状态码:</span> {selected.statusCode || '-'}</div>
              <div><span className="text-muted-foreground">时间:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              <div>
                <span className="text-muted-foreground">Payload:</span>
                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
              <div>
                <span className="text-muted-foreground">Response:</span>
                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">{selected.response || '-'}</pre>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
