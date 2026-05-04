import { useState, useEffect } from 'react'
import { Plus, Trash2, Key, ArrowLeft, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getApiKeys, createApiKey, deleteApiKey, type ApiKey, type CreateApiKeyResponse } from '@/lib/api'
import { useNavigate, useParams } from 'react-router-dom'

export function ApiKeys() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '' })
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadApiKeys()
    }
  }, [projectId])

  const loadApiKeys = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getApiKeys(projectId)
      if (res.code === 0) {
        setApiKeys(res.data)
      } else {
        setError(res.msg)
      }
    } catch (err) {
      setError('Failed to load API Keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({ name: '' })
    setCreatedKey(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API Key?')) return
    try {
      const res = await deleteApiKey(id)
      if (res.code === 0) {
        setApiKeys(apiKeys.filter(k => k.id !== id))
      } else {
        alert(res.msg || 'Delete failed')
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    try {
      const res = await createApiKey({ name: formData.name, projectId })
      if (res.code === 0) {
        setCreatedKey(res.data)
        setApiKeys([{
          id: res.data.id,
          name: res.data.name,
          keyPrefix: res.data.keyPrefix,
          createdAt: res.data.createdAt
        }, ...apiKeys])
      } else {
        alert(res.msg || 'Create failed')
      }
    } catch (err) {
      alert('Create failed')
    }
  }

  const handleCopy = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setCreatedKey(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold">API Keys</h1>
        </div>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> Create</Button>
      </header>

      <main className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No API Keys yet</p>
            <p className="text-sm">Create your first API Key to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map(apiKey => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell className="font-mono text-sm">{apiKey.keyPrefix}</TableCell>
                  <TableCell>{new Date(apiKey.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(apiKey.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          {!createdKey ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My API Key"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this API key now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <Input value={createdKey.key} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="bg-card border rounded-md p-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{createdKey.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prefix:</span>
                    <span className="font-mono">{createdKey.keyPrefix}</span>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={handleCloseDialog}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}