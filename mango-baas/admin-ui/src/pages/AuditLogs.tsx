import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAuditLogs, type AuditLog } from '@/lib/api'

const ACTION_TYPES = ['create', 'update', 'delete', 'login', 'logout', 'query']

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    startDate: '',
    endDate: '',
  })
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    loadLogs()
  }, [page])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs({
        page,
        limit,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
      })
      if (res.code === 0) {
        setLogs(res.data)
        setTotal(res.pagination.total)
      } else {
        setError(res.msg)
      }
    } catch (err) {
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    setPage(1)
    loadLogs()
  }

  const handleClearFilters = () => {
    setFilters({ userId: '', action: '', startDate: '', endDate: '' })
    setPage(1)
    loadLogs()
  }

  const handleRowClick = (log: AuditLog) => {
    setDetailLog(log)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4">
        <h1 className="text-xl font-bold">Audit Logs</h1>
      </header>

      <main className="p-6">
        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">User ID</Label>
              <Input
                className="w-40"
                value={filters.userId}
                onChange={e => setFilters({ ...filters, userId: e.target.value })}
                placeholder="User ID"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Action</Label>
              <select
                className="w-32 h-10 px-3 border rounded-md bg-background"
                value={filters.action}
                onChange={e => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All</option>
                {ACTION_TYPES.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                className="w-40"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                className="w-40"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFilter}><Search className="w-4 h-4 mr-1" /> Search</Button>
              <Button variant="outline" onClick={handleClearFilters}><X className="w-4 h-4 mr-1" /> Clear</Button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs</TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleRowClick(log)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{log.userId}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.action === 'delete' ? 'bg-red-100 text-red-700' :
                          log.action === 'create' ? 'bg-green-100 text-green-700' :
                          log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>{log.resource}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}, Total {total} records
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">ID:</span>
                  <p className="mt-1 font-mono text-xs">{detailLog.id}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Time:</span>
                  <p className="mt-1">{new Date(detailLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">User:</span>
                  <p className="mt-1">{detailLog.userId}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Action:</span>
                  <p className="mt-1">{detailLog.action}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Resource:</span>
                  <p className="mt-1">{detailLog.resource}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Resource ID:</span>
                  <p className="mt-1">{detailLog.resourceId || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">IP:</span>
                  <p className="mt-1">{detailLog.ip || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">User Agent:</span>
                  <p className="mt-1 break-all">{detailLog.userAgent || '-'}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Details:</span>
                <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto">
                  {detailLog.details ? JSON.stringify(detailLog.details, null, 2) : '-'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}