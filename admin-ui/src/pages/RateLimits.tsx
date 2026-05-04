import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getRateLimits, createRateLimit, updateRateLimit, deleteRateLimit, type RateLimitRule } from '@/lib/api'

export function RateLimits() {
  const [rules, setRules] = useState<RateLimitRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    identifier: 'global' | 'project' | 'apikey' | 'user'
    key: string
    limit: number
    windowSec: number
    projectId: string
    enabled: boolean
  }>({
    name: '',
    identifier: 'global',
    key: '',
    limit: 100,
    windowSec: 60,
    projectId: '',
    enabled: true,
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    setLoading(true)
    try {
      const res = await getRateLimits()
      if (res.code === 0) {
        setRules(res.data)
      } else {
        setError(res.msg)
      }
    } catch (err) {
      setError('Failed to load rate limit rules')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      identifier: 'global',
      key: '',
      limit: 100,
      windowSec: 60,
      projectId: '',
      enabled: true,
    })
    setDialogOpen(true)
  }

  const handleEdit = (rule: RateLimitRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      identifier: rule.identifier,
      key: rule.key || '',
      limit: rule.limit,
      windowSec: rule.windowSec,
      projectId: rule.projectId || '',
      enabled: rule.enabled,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rate limit rule?')) return
    try {
      const res = await deleteRateLimit(id)
      if (res.code === 0) {
        setRules(rules.filter(r => r.id !== id))
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        identifier: formData.identifier,
        key: formData.key || undefined,
        limit: formData.limit,
        windowSec: formData.windowSec,
        projectId: formData.projectId || undefined,
        enabled: formData.enabled,
      }

      if (editingRule) {
        const res = await updateRateLimit(editingRule.id, payload)
        if (res.code === 0) {
          setRules(rules.map(r => r.id === editingRule.id ? res.data : r))
          setDialogOpen(false)
        }
      } else {
        const res = await createRateLimit(payload)
        if (res.code === 0) {
          setRules([res.data, ...rules])
          setDialogOpen(false)
        }
      }
    } catch (err) {
      alert('Operation failed')
    }
  }

  const getIdentifierLabel = (identifier: string) => {
    const labels: Record<string, string> = {
      global: '全局',
      project: '项目',
      apikey: 'API Key',
      user: '用户',
    }
    return labels[identifier] || identifier
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">速率限制</h1>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> 创建规则</Button>
      </header>

      <main className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : rules.length === 0 ? (
          <p className="text-muted-foreground">No rate limit rules configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>限制次数</TableHead>
                <TableHead>时间窗口</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{getIdentifierLabel(rule.identifier)}</TableCell>
                  <TableCell>{rule.key || '-'}</TableCell>
                  <TableCell>{rule.limit}</TableCell>
                  <TableCell>{rule.windowSec}秒</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.enabled ? '启用' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(rule.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(rule.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '创建规则'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>名称</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>类型</Label>
                <select className="w-full border rounded-md px-3 py-2 bg-background" value={formData.identifier} onChange={e => setFormData({ ...formData, identifier: e.target.value as 'global' | 'project' | 'apikey' | 'user' })}>
                  <option value="global">全局</option>
                  <option value="project">项目</option>
                  <option value="apikey">API Key</option>
                  <option value="user">用户</option>
                </select>
              </div>
              <div>
                <Label>Key (可选)</Label>
                <Input value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} placeholder={formData.identifier === 'project' ? '项目ID' : formData.identifier === 'user' ? '用户ID' : '特定标识符'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>限制次数</Label>
                  <Input type="number" value={formData.limit} onChange={e => setFormData({ ...formData, limit: parseInt(e.target.value) || 0 })} required min={1} />
                </div>
                <div>
                  <Label>时间窗口 (秒)</Label>
                  <Input type="number" value={formData.windowSec} onChange={e => setFormData({ ...formData, windowSec: parseInt(e.target.value) || 0 })} required min={1} />
                </div>
              </div>
              <div>
                <Label>项目ID (可选)</Label>
                <Input value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} placeholder="项目级限制时填写" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="enabled" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} />
                <Label htmlFor="enabled">启用此规则</Label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit">{editingRule ? '更新' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
