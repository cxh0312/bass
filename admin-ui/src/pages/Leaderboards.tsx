import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  getLeaderboards,
  createLeaderboard,
  updateLeaderboard,
  deleteLeaderboard,
  type Leaderboard
} from '@/lib/api'

export function Leaderboards() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLeaderboard, setEditingLeaderboard] = useState<Leaderboard | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    metric: 'higher' | 'lower'
    updateStrategy: 'realtime' | 'scheduled'
    resetSchedule: string
    enabled: boolean
  }>({
    name: '',
    description: '',
    metric: 'higher',
    updateStrategy: 'realtime',
    resetSchedule: '',
    enabled: true,
  })

  useEffect(() => {
    loadLeaderboards()
  }, [projectId])

  const loadLeaderboards = async () => {
    setLoading(true)
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const res = await getLeaderboards(query)
      if (res.code === 0) {
        setLeaderboards(res.data)
      } else {
        setError(res.msg)
      }
    } catch (err) {
      setError('Failed to load leaderboards')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingLeaderboard(null)
    setFormData({
      name: '',
      description: '',
      metric: 'higher',
      updateStrategy: 'realtime',
      resetSchedule: '',
      enabled: true,
    })
    setDialogOpen(true)
  }

  const handleEdit = (lb: Leaderboard) => {
    setEditingLeaderboard(lb)
    setFormData({
      name: lb.name,
      description: lb.description || '',
      metric: lb.metric,
      updateStrategy: lb.updateStrategy,
      resetSchedule: lb.resetSchedule || '',
      enabled: lb.enabled,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this leaderboard?')) return
    try {
      const res = await deleteLeaderboard(id)
      if (res.code === 0) {
        setLeaderboards(leaderboards.filter(lb => lb.id !== id))
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLeaderboard) {
        const submitData = { name: formData.name, description: formData.description, metric: formData.metric, updateStrategy: formData.updateStrategy, resetSchedule: formData.resetSchedule || undefined, enabled: formData.enabled }
        const res = await updateLeaderboard(editingLeaderboard.id, submitData)
        if (res.code === 0) {
          setLeaderboards(leaderboards.map(lb => lb.id === editingLeaderboard.id ? res.data : lb))
          setDialogOpen(false)
        }
      } else {
        const submitData = { projectId: projectId || '', name: formData.name, description: formData.description, metric: formData.metric, updateStrategy: formData.updateStrategy, resetSchedule: formData.resetSchedule || undefined, enabled: formData.enabled }
        const res = await createLeaderboard(submitData)
        if (res.code === 0) {
          setLeaderboards([res.data, ...leaderboards])
          setDialogOpen(false)
        }
      }
    } catch (err) {
      alert('Operation failed')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Leaderboards</h1>
        <div className="flex gap-2">
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> Create</Button>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : leaderboards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No leaderboards yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboards.map(lb => (
                <TableRow key={lb.id}>
                  <TableCell className="font-medium">
                    <button
                      className="text-primary hover:underline"
                      onClick={() => navigate(`/projects/${lb.projectId}/leaderboards/${lb.id}`)}
                    >
                      {lb.name}
                    </button>
                  </TableCell>
                  <TableCell>{lb.description || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${lb.metric === 'higher' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {lb.metric === 'higher' ? 'Higher is better' : 'Lower is better'}
                    </span>
                  </TableCell>
                  <TableCell>{lb.updateStrategy}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${lb.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {lb.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(lb.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(lb)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(lb.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
            <DialogTitle>{editingLeaderboard ? 'Edit Leaderboard' : 'Create Leaderboard'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Metric</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={formData.metric}
                  onChange={e => setFormData({ ...formData, metric: e.target.value as 'higher' | 'lower' })}
                >
                  <option value="higher">Higher is better</option>
                  <option value="lower">Lower is better</option>
                </select>
              </div>
              <div>
                <Label>Update Strategy</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={formData.updateStrategy}
                  onChange={e => setFormData({ ...formData, updateStrategy: e.target.value as 'realtime' | 'scheduled' })}
                >
                  <option value="realtime">Realtime</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              {formData.updateStrategy === 'scheduled' && (
                <div>
                  <Label>Reset Schedule (cron)</Label>
                  <Input
                    value={formData.resetSchedule}
                    onChange={e => setFormData({ ...formData, resetSchedule: e.target.value })}
                    placeholder="0 0 * * 1"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingLeaderboard ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
