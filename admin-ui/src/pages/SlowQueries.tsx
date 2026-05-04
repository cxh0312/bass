import { useState, useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getSlowQueries, type SlowQuery } from '@/lib/api'

export function SlowQueries() {
  const [queries, setQueries] = useState<SlowQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    loadQueries()
  }, [page])

  async function loadQueries() {
    try {
      setLoading(true)
      const res = await getSlowQueries(page, limit)
      if (res.code === 0) {
        setQueries(res.data)
        setTotal(res.pagination.total)
      }
    } catch (err) {
      setError('Failed to load slow queries')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  function getDurationBadge(ms: number) {
    if (ms >= 5000) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    if (ms >= 2000) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Slow Queries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">API calls with response time {'>'} 1000ms</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : queries.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No slow queries detected. System is running fast!</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queries.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(q.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[300px] truncate">
                      {q.endpoint}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {q.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${q.statusCode >= 400 ? 'text-destructive' : ''}`}>
                        {q.statusCode}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs px-2 py-1 rounded font-mono ${getDurationBadge(q.durationMs)}`}>
                        {q.durationMs.toLocaleString()}ms
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total: {total} records</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm rounded border bg-card disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm rounded border bg-card disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
