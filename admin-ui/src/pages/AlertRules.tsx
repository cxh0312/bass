import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Bell, BellOff, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, checkAlerts, type AlertRule } from '@/lib/api'

const METRIC_LABELS: Record<string, string> = {
  error_rate: 'Error Rate',
  response_time: 'Response Time',
  quota: 'Quota Usage',
}

const METRIC_UNITS: Record<string, string> = {
  error_rate: '%',
  response_time: 'ms',
  quota: 'calls',
}

export function AlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [checkResult, setCheckResult] = useState<any[] | null>(null)
  const [checking, setChecking] = useState(false)
  const [formData, setFormData] = useState<{
    name: string
    metric: 'error_rate' | 'response_time' | 'quota'
    threshold: number
    condition: string
    windowMin: number
    notifyWebhook: string
    notifyEmail: string
    projectId: string
  }>({
    name: '',
    metric: 'error_rate' as const,
    threshold: 80,
    condition: 'gt',
    windowMin: 5,
    notifyWebhook: '',
    notifyEmail: '',
    projectId: '',
  })

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    try {
      setLoading(true)
      const res = await getAlertRules()
      if (res.code === 0) setRules(res.data)
    } catch (err) {
      setError('Failed to load alert rules')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setEditingRule(null)
    setFormData({ name: '', metric: 'error_rate', threshold: 80, condition: 'gt', windowMin: 5, notifyWebhook: '', notifyEmail: '', projectId: '' } as const)
    setDialogOpen(true)
  }

  function handleEdit(rule: AlertRule) {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
      condition: rule.condition,
      windowMin: rule.windowMin,
      notifyWebhook: rule.notifyWebhook || '',
      notifyEmail: rule.notifyEmail || '',
      projectId: rule.projectId || '',
    })
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this alert rule?')) return
    try {
      const res = await deleteAlertRule(id)
      if (res.code === 0) setRules(rules.filter(r => r.id !== id))
    } catch (err) {
      alert('Delete failed')
    }
  }

  async function handleToggle(rule: AlertRule) {
    try {
      const res = await updateAlertRule(rule.id, { enabled: !rule.enabled })
      if (res.code === 0) setRules(rules.map(r => r.id === rule.id ? res.data : r))
    } catch (err) {
      alert('Update failed')
    }
  }

  async function handleCheck() {
    setChecking(true)
    try {
      const res = await checkAlerts()
      if (res.code === 0) setCheckResult(res.data)
    } catch (err) {
      alert('Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingRule) {
        const res = await updateAlertRule(editingRule.id, {
          name: formData.name,
          metric: formData.metric,
          threshold: formData.threshold,
          condition: formData.condition,
          windowMin: formData.windowMin,
          notifyWebhook: formData.notifyWebhook || undefined,
          notifyEmail: formData.notifyEmail || undefined,
          projectId: formData.projectId || undefined,
        })
        if (res.code === 0) {
          setRules(rules.map(r => r.id === editingRule.id ? res.data : r))
          setDialogOpen(false)
        }
      } else {
        const res = await createAlertRule({
          name: formData.name,
          metric: formData.metric,
          threshold: formData.threshold,
          condition: formData.condition,
          windowMin: formData.windowMin,
          notifyWebhook: formData.notifyWebhook || undefined,
          notifyEmail: formData.notifyEmail || undefined,
          projectId: formData.projectId || undefined,
        })
        if (res.code === 0) {
          setRules([res.data, ...rules])
          setDialogOpen(false)
        }
      }
    } catch (err) {
      alert('Operation failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Rules</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure monitoring alerts for error rate, response time, and quota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCheck} disabled={checking}>
            <Zap className="w-4 h-4 mr-1" />
            {checking ? 'Checking...' : 'Check Now'}
          </Button>
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> Create</Button>
        </div>
      </div>

      {checkResult && (
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Check Results</h3>
          {checkResult.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear, no alerts triggered.</p>
          ) : (
            <div className="space-y-2">
              {checkResult.map((r, i) => (
                <div key={i} className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  <p className="font-medium">{r.ruleName}</p>
                  <p>{r.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : rules.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No alert rules configured</p>
          <Button variant="link" onClick={handleCreate}>Create your first rule</Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Notify</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {METRIC_LABELS[rule.metric] || rule.metric}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {rule.condition === 'gt' ? '>' : '<'} {rule.threshold}{METRIC_UNITS[rule.metric] || ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rule.windowMin}min</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rule.notifyWebhook ? 'Webhook' : rule.notifyEmail ? 'Email' : 'None'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${rule.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}
                    >
                      {rule.enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                      {rule.enabled ? 'Active' : 'Off'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(rule.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="High error rate alert" />
              </div>
              <div>
                <Label>Metric</Label>
                <select
                  value={formData.metric}
                  onChange={e => setFormData({ ...formData, metric: e.target.value as 'error_rate' | 'response_time' | 'quota' })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="error_rate">Error Rate</option>
                  <option value="response_time">Response Time</option>
                  <option value="quota">Quota Usage</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Condition</Label>
                  <select
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                  </select>
                </div>
                <div>
                  <Label>Threshold</Label>
                  <Input
                    type="number"
                    value={formData.threshold}
                    onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    required
                    min={0}
                  />
                </div>
              </div>
              <div>
                <Label>Evaluation Window (minutes)</Label>
                <Input
                  type="number"
                  value={formData.windowMin}
                  onChange={e => setFormData({ ...formData, windowMin: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Webhook URL (optional)</Label>
                <Input value={formData.notifyWebhook} onChange={e => setFormData({ ...formData, notifyWebhook: e.target.value })} placeholder="https://hooks.slack.com/..." />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input value={formData.notifyEmail} onChange={e => setFormData({ ...formData, notifyEmail: e.target.value })} type="email" placeholder="admin@example.com" />
              </div>
              {!editingRule && (
                <div>
                  <Label>Project ID (optional, empty = global)</Label>
                  <Input value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} placeholder="Leave empty for all projects" />
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingRule ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
