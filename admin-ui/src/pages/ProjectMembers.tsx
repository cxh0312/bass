import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getProjectMembers, addProjectMember, removeProjectMember, type ProjectMember } from '@/lib/api'

export function ProjectMembers() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')

  useEffect(() => {
    if (projectId) loadMembers()
  }, [projectId])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const res = await getProjectMembers(projectId!)
      if (res.code === 0) setMembers(res.data)
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) return
    try {
      await addProjectMember(projectId!, userId.trim(), role)
      setUserId('')
      setRole('editor')
      setDialogOpen(false)
      loadMembers()
    } catch (err) {
      console.error('Failed to add member:', err)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('确定移除该成员？')) return
    try {
      await removeProjectMember(projectId!, memberId)
      loadMembers()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />返回
          </Button>
          <h1 className="text-xl font-bold">项目成员</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />添加成员
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>邮箱</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无成员</TableCell></TableRow>
            ) : (
              members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>{m.user.name || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${m.role === 'editor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {m.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(m.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加成员</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户 ID</label>
                <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="输入用户 ID" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">添加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
