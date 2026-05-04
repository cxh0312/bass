import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap, ArrowLeft, Copy, Check, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, type Webhook } from '@/lib/api'

const EVENT_TYPES = [
  'record.created',
  'record.updated',
  'record.deleted',
  'collection.created',
  'collection.updated',
  'collection.deleted',
]

export function Webhooks() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [newSecret, setNewSecret] = useState('')
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [formData, setFormData] = useState({ name: '', url: '', events: [] as string[] })
  const [testStatus, setTestStatus] = useState<{ id: string; status: 'testing' | 'success' | 'error'; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      loadWebhooks()
    }
  }, [projectId])

  const loadWebhooks = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getWebhooks(projectId)
      if (res.code === 0) {
        setWebhooks(res.data)
      } else {
        setError(res.msg)
      }
    } catch (err) {
      setError('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingWebhook(null)
    setFormData({ name: '', url: '', events: [] })
    setDialogOpen(true)
  }

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setFormData({ name: webhook.name, url: webhook.url, events: webhook.events })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    try {
      const res = await deleteWebhook(id)
      if (res.code === 0) {
        setWebhooks(webhooks.filter(w => w.id !== id))
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  const handleTest = async (id: string) => {
    setTestStatus({ id, status: 'testing', message: 'Testing...' })
    try {
      const res = await testWebhook(id)
      if (res.success) {
        setTestStatus({ id, status: 'success', message: `Success: HTTP ${res.statusCode}` })
      } else {
        setTestStatus({ id, status: 'error', message: `Failed: ${res.error}` })
      }
    } catch (err: any) {
      setTestStatus({ id, status: 'error', message: err.message })
    }
    setTimeout(() => setTestStatus(null), 5000)
  }

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const res = await updateWebhook(webhook.id, { active: !webhook.active })
      if (res.code === 0) {
        setWebhooks(webhooks.map(w => w.id === webhook.id ? res.data : w))
      }
    } catch (err) {
      alert('Update failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    try {
      if (editingWebhook) {
        const res = await updateWebhook(editingWebhook.id, formData)
        if (res.code === 0) {
          setWebhooks(webhooks.map(w => w.id === editingWebhook.id ? res.data : w))
          setDialogOpen(false)
        }
      } else {
        const res = await createWebhook({ projectId, ...formData })
        if (res.code === 0) {
          setWebhooks([res.data, ...webhooks])
          setDialogOpen(false)
          if (res.data.secret) {
            setNewSecret(res.data.secret)
            setSecretDialogOpen(true)
          }
        }
      }
    } catch (err) {
      alert('Operation failed')
    }
  }

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Webhooks</h1>
        </div>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> Create</Button>
      </header>

      <main className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No webhooks yet</p>
            <Button variant="link" onClick={handleCreate}>Create your first webhook</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map(webhook => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map(event => (
                        <span key={event} className="text-xs bg-muted px-2 py-1 rounded">{event}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(webhook)}
                      className={`px-2 py-1 rounded text-xs ${webhook.active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell>{new Date(webhook.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTest(webhook.id)}
                        title="Test webhook"
                      >
                        <Zap className={`w-4 h-4 ${testStatus?.id === webhook.id ? (
                          testStatus.status === 'testing' ? 'animate-pulse' :
                          testStatus.status === 'success' ? 'text-green-500' : 'text-destructive'
                        ) : ''}`} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${projectId}/webhooks/${webhook.id}/deliveries`)} title="投递记录"><List className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(webhook)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(webhook.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {testStatus && (
          <div className={`mt-4 p-3 rounded-md ${testStatus.status === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-destructive/10 text-destructive'}`}>
            {testStatus.message}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="My Webhook" />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} required placeholder="https://example.com/webhook" />
              </div>
              <div>
                <Label>Events</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EVENT_TYPES.map(event => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`px-3 py-1 rounded-full text-sm border ${formData.events.includes(event) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-muted-foreground/20'}`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingWebhook ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Secret</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Copy this secret now. You won't be able to see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm break-all">{newSecret}</code>
            <Button size="icon" variant="outline" onClick={() => copySecret(newSecret, 'new')}>
              {copiedId === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setSecretDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}